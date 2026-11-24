import * as asn1js from 'asn1js'
import * as pkijs from 'pkijs'
import { webcrypto } from 'node:crypto'

pkijs.setEngine(
  'nodeEngine',
  new pkijs.CryptoEngine({
    name: 'nodeEngine',
    crypto: webcrypto as unknown as Crypto,
    subtle: webcrypto.subtle as SubtleCrypto,
  }) as unknown as pkijs.ICryptoEngine
)

const OID_DATA = '1.2.840.113549.1.7.1'
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2'
const OID_CONTENT_TYPE = '1.2.840.113549.1.9.3'
const OID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4'
const OID_SIGNING_TIME = '1.2.840.113549.1.9.5'
const OID_SHA256 = '2.16.840.1.101.3.4.2.1'
const OID_RSA_ENCRYPTION = '1.2.840.113549.1.1.1'

export async function buildPreparedSignerInfo(params: { certDer: ArrayBuffer; contentDigest: Buffer }): Promise<{ signerInfoDer: Buffer; digestToSign: Buffer }> {
  const cert = pkijs.Certificate.fromBER(params.certDer)
  const contentDigestAB = params.contentDigest.buffer.slice(params.contentDigest.byteOffset, params.contentDigest.byteOffset + params.contentDigest.byteLength) as ArrayBuffer

  const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
    type: 0,
    attributes: [
      new pkijs.Attribute({
        type: OID_CONTENT_TYPE,
        values: [new asn1js.ObjectIdentifier({ value: OID_DATA })],
      }),
      new pkijs.Attribute({
        type: OID_MESSAGE_DIGEST,
        values: [new asn1js.OctetString({ valueHex: contentDigestAB })],
      }),
      new pkijs.Attribute({
        type: OID_SIGNING_TIME,
        values: [new asn1js.UTCTime({ valueDate: new Date() })],
      }),
    ],
  })

  const signedAttrsDer = signedAttrs.toSchema().toBER(false)
  const reparsedAttrs = new pkijs.SignedAndUnsignedAttributes({
    type: 0,
    schema: asn1js.fromBER(signedAttrsDer).result,
  })

  const digestToSign = Buffer.from(await webcrypto.subtle.digest('SHA-256', reparsedAttrs.encodedValue))

  const signerInfo = new pkijs.SignerInfo({
    version: 1,
    sid: new pkijs.IssuerAndSerialNumber({ issuer: cert.issuer, serialNumber: cert.serialNumber }),
    digestAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID_SHA256, algorithmParams: new asn1js.Null() }),
    signedAttrs: reparsedAttrs,
    signatureAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID_RSA_ENCRYPTION, algorithmParams: new asn1js.Null() }),
    signature: new asn1js.OctetString({ valueHex: new ArrayBuffer(0) }),
  })

  return {
    signerInfoDer: Buffer.from(signerInfo.toSchema().toBER(false)),
    digestToSign,
  }
}

function dnToString(dn: pkijs.RelativeDistinguishedNames): string {
  return dn.typesAndValues.map((tv) => `${tv.type}=${tv.value.valueBlock.value}`).join(',')
}

export function buildMinimalChain(certDer: ArrayBuffer, candidatePoolDer: ArrayBuffer[]): ArrayBuffer[] {
  const leaf = pkijs.Certificate.fromBER(certDer)
  const pool = candidatePoolDer.map((der) => ({ der, cert: pkijs.Certificate.fromBER(der) }))

  const chain: ArrayBuffer[] = []
  const visitedIssuers = new Set<string>()
  let wantIssuerDn = dnToString(leaf.issuer)

  while (!visitedIssuers.has(wantIssuerDn)) {
    visitedIssuers.add(wantIssuerDn)

    const match = pool.find((p) => dnToString(p.cert.subject) === wantIssuerDn)
    if (!match) break

    const isSelfSigned = dnToString(match.cert.issuer) === dnToString(match.cert.subject)
    if (isSelfSigned) break

    chain.push(match.der)
    wantIssuerDn = dnToString(match.cert.issuer)
  }

  return chain
}

export function finalizeSignedData(params: { signerInfoDer: Buffer; signatureBytes: Buffer; certDer: ArrayBuffer; certChainDer?: ArrayBuffer[] }): Buffer {
  const signerInfoDerAB = params.signerInfoDer.buffer.slice(params.signerInfoDer.byteOffset, params.signerInfoDer.byteOffset + params.signerInfoDer.byteLength) as ArrayBuffer
  const signatureBytesAB = params.signatureBytes.buffer.slice(params.signatureBytes.byteOffset, params.signatureBytes.byteOffset + params.signatureBytes.byteLength) as ArrayBuffer

  const signerInfo = new pkijs.SignerInfo({ schema: asn1js.fromBER(signerInfoDerAB).result })
  signerInfo.signature = new asn1js.OctetString({ valueHex: signatureBytesAB })

  const cert = pkijs.Certificate.fromBER(params.certDer)
  const chainCerts = (params.certChainDer ?? []).map((der) => pkijs.Certificate.fromBER(der))

  const signedData = new pkijs.SignedData({
    version: 1,
    digestAlgorithms: [new pkijs.AlgorithmIdentifier({ algorithmId: OID_SHA256, algorithmParams: new asn1js.Null() })],
    encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: OID_DATA }),
    certificates: [cert, ...chainCerts],
    signerInfos: [signerInfo],
  })

  const contentInfo = new pkijs.ContentInfo({
    contentType: OID_SIGNED_DATA,
    content: signedData.toSchema(true),
  })

  return Buffer.from(contentInfo.toSchema().toBER(false))
}

const OID_COMMON_NAME = '2.5.4.3'
const commonName = (dn: pkijs.RelativeDistinguishedNames) => dn.typesAndValues.find((tv) => tv.type === OID_COMMON_NAME)?.value.valueBlock.value as string | undefined

export interface CertificateInfo {
  subject?: string
  issuer?: string
  serialNumber: string
  notBefore: Date
  notAfter: Date
  isRsa: boolean
}

/** What the signing bridge's certificate is, for validity checks and the audit record. */
export function inspectCertificate(certDer: ArrayBuffer): CertificateInfo {
  const cert = pkijs.Certificate.fromBER(certDer)
  return {
    subject: commonName(cert.subject),
    issuer: commonName(cert.issuer),
    serialNumber: Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString('hex'),
    notBefore: cert.notBefore.value,
    notAfter: cert.notAfter.value,
    isRsa: cert.subjectPublicKeyInfo.algorithm.algorithmId === OID_RSA_ENCRYPTION,
  }
}

/** Checks the finished CMS signature against the PDF bytes it covers, exactly as a verifier would. */
export async function verifyCmsSignature(cmsDer: Buffer, signedContent: Buffer): Promise<boolean> {
  try {
    const cmsAB = cmsDer.buffer.slice(cmsDer.byteOffset, cmsDer.byteOffset + cmsDer.byteLength) as ArrayBuffer
    const contentInfo = new pkijs.ContentInfo({ schema: asn1js.fromBER(cmsAB).result })
    const signedData = new pkijs.SignedData({ schema: contentInfo.content })
    const contentAB = signedContent.buffer.slice(signedContent.byteOffset, signedContent.byteOffset + signedContent.byteLength) as ArrayBuffer
    return Boolean(await signedData.verify({ signer: 0, data: contentAB, checkChain: false }))
  } catch {
    return false
  }
}

/** The certificate of the first signer of a CMS signature, when the signature embeds it. */
export function describeCmsSigner(cmsDer: Buffer): CertificateInfo | undefined {
  try {
    const cmsAB = cmsDer.buffer.slice(cmsDer.byteOffset, cmsDer.byteOffset + cmsDer.byteLength) as ArrayBuffer
    const contentInfo = new pkijs.ContentInfo({ schema: asn1js.fromBER(cmsAB).result })
    const signedData = new pkijs.SignedData({ schema: contentInfo.content })
    const sid = signedData.signerInfos[0]?.sid
    const certificates = (signedData.certificates ?? []).filter((c): c is pkijs.Certificate => c instanceof pkijs.Certificate)
    const cert = (sid instanceof pkijs.IssuerAndSerialNumber ? certificates.find((c) => c.serialNumber.isEqual(sid.serialNumber)) : undefined) ?? certificates[0]
    return cert ? inspectCertificate(cert.toSchema(true).toBER(false)) : undefined
  } catch {
    return undefined
  }
}
