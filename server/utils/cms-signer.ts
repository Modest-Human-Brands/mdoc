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
    signature: new asn1js.OctetString({ valueHex: new ArrayBuffer(0) }), // placeholder — filled in below
  })

  return {
    signerInfoDer: Buffer.from(signerInfo.toSchema().toBER(false)),
    digestToSign,
  }
}

function dnToString(dn: pkijs.RelativeDistinguishedNames): string {
  return dn.typesAndValues.map((tv) => `${tv.type}=${tv.value.valueBlock.value}`).join(',')
}

/**
 * Reconstructs the real, minimal certificate chain for `certDer` by walking issuer -> subject
 * DN links starting from the leaf, rather than trusting whatever the caller supplied.
 *
 * Local signing bridges (e.g. USB DSC token middleware) sometimes hand back every certificate
 * cached in the local trust store instead of just this cert's actual chain -- embedding that
 * verbatim can blow the CMS well past what a PDF /Contents hex string can hold. This walks
 * issuer(leaf) -> matching subject in the pool -> issuer(that cert) -> ... until either no match
 * is found or a self-signed root is reached, and returns only the certs that are genuinely part
 * of the chain, excluding the self-signed root itself (verifiers already trust roots
 * out-of-band, so it never needs to be embedded).
 */
export function buildMinimalChain(certDer: ArrayBuffer, candidatePoolDer: ArrayBuffer[]): ArrayBuffer[] {
  const leaf = pkijs.Certificate.fromBER(certDer)
  const pool = candidatePoolDer.map((der) => ({ der, cert: pkijs.Certificate.fromBER(der) }))

  const chain: ArrayBuffer[] = []
  const visitedIssuers = new Set<string>()
  let wantIssuerDn = dnToString(leaf.issuer)

  while (!visitedIssuers.has(wantIssuerDn)) {
    visitedIssuers.add(wantIssuerDn)

    const match = pool.find((p) => dnToString(p.cert.subject) === wantIssuerDn)
    if (!match) break // no cert in the pool issues for wantIssuerDn -- chain is as complete as it can be

    const isSelfSigned = dnToString(match.cert.issuer) === dnToString(match.cert.subject)
    if (isSelfSigned) break // this is the root -- don't embed it

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
