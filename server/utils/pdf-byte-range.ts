interface Placeholders {
  brOpen: number
  brClose: number
  ltIdx: number
  gtIdx: number
}

function locatePlaceholders(pdfBytes: Buffer): Placeholders {
  const str = pdfBytes.toString('latin1')

  const brLabelIdx = str.indexOf('/ByteRange')
  if (brLabelIdx === -1) throw new Error('No /ByteRange found — was pdflibAddPlaceholder applied?')
  const brOpen = str.indexOf('[', brLabelIdx)
  const brClose = str.indexOf(']', brOpen)
  if (brOpen === -1 || brClose === -1) throw new Error('Malformed /ByteRange placeholder')

  const contentsRegex = /\/Contents\s*</g
  contentsRegex.lastIndex = brLabelIdx
  const match = contentsRegex.exec(str)
  if (!match) throw new Error('No /Contents hex-string placeholder found after /ByteRange')

  const ltIdx = match.index + match[0].lastIndexOf('<')
  const gtIdx = str.indexOf('>', ltIdx)
  if (gtIdx === -1) throw new Error('Malformed /Contents hex-string placeholder')

  return { brOpen, brClose, ltIdx, gtIdx }
}

export function patchByteRange(pdfBytes: Buffer) {
  const { brOpen, brClose, ltIdx, gtIdx } = locatePlaceholders(pdfBytes)
  const reservedLen = brClose - brOpen + 1
  const totalLen = pdfBytes.length

  const byteRange = [0, ltIdx, gtIdx + 1, totalLen - (gtIdx + 1)]
  const byteRangeStr = `[${byteRange.join(' ')}]`
  if (byteRangeStr.length > reservedLen) {
    throw new Error('Reserved /ByteRange placeholder too small for actual file size')
  }
  const padded = byteRangeStr.slice(0, -1) + ' '.repeat(reservedLen - byteRangeStr.length) + ']'

  const patchedBytes = Buffer.concat([pdfBytes.subarray(0, brOpen), Buffer.from(padded, 'latin1'), pdfBytes.subarray(brClose + 1)])

  return { patchedBytes, ltIdx, gtIdx, byteRange }
}

export function extractSigningContent(patchedBytes: Buffer, ltIdx: number, gtIdx: number): Buffer {
  return Buffer.concat([patchedBytes.subarray(0, ltIdx), patchedBytes.subarray(gtIdx + 1)])
}

export function embedSignature(patchedBytes: Buffer, cmsDerBuffer: Buffer, ltIdx: number, gtIdx: number): Buffer {
  const hexCapacity = gtIdx - ltIdx - 1
  const hexSig = cmsDerBuffer.toString('hex')
  if (hexSig.length > hexCapacity) {
    throw new Error(`Signature (${hexSig.length} hex chars) exceeds reserved placeholder (${hexCapacity}). ` + 'Increase signatureLength passed to pdflibAddPlaceholder.')
  }
  const paddedHex = hexSig + '0'.repeat(hexCapacity - hexSig.length)

  return Buffer.concat([patchedBytes.subarray(0, ltIdx + 1), Buffer.from(paddedHex, 'ascii'), patchedBytes.subarray(gtIdx)])
}
