import * as asn1js from 'asn1js'
import * as pkijs from 'pkijs'
import { webcrypto } from 'node:crypto'

pkijs.setEngine('nodeEngine', new pkijs.CryptoEngine({ name: 'nodeEngine', crypto: webcrypto as unknown as Crypto, subtle: webcrypto.subtle }))

const OID_DATA = '1.2.840.113549.1.7.1'
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2'
const OID_CONTENT_TYPE = '1.2.840.113549.1.9.3'
const OID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4'
const OID_SIGNING_TIME = '1.2.840.113549.1.9.5'
const OID_SHA256 = '2.16.840.1.101.3.4.2.1'
const OID_RSA_ENCRYPTION = '1.2.840.113549.1.1.1'

export async function buildPreparedSignerInfo(params: { certDer: ArrayBuffer; contentDigest: Buffer }): Promise<{ signerInfoDer: Buffer; digestToSign: Buffer }> {
  const cert = pkijs.Certificate.fromBER(params.certDer)

  const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
    type: 0,
    attributes: [
      new pkijs.Attribute({
        type: OID_CONTENT_TYPE,
        values: [new asn1js.ObjectIdentifier({ value: OID_DATA })],
      }),
      new pkijs.Attribute({
        type: OID_MESSAGE_DIGEST,
        values: [new asn1js.OctetString({ valueHex: params.contentDigest })],
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

export function finalizeSignedData(params: { signerInfoDer: Buffer; signatureBytes: Buffer; certDer: ArrayBuffer; certChainDer?: ArrayBuffer[] }): Buffer {
  const signerInfo = new pkijs.SignerInfo({ schema: asn1js.fromBER(params.signerInfoDer).result })
  signerInfo.signature = new asn1js.OctetString({ valueHex: params.signatureBytes })

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
