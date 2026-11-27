import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from 'pdf-lib'

const RED = rgb(1, 0, 0)
const REASON_X = 80
const STAMP = 'VOID'
const STAMP_ANGLE = 45
/** Height of Helvetica Bold capitals, per point of font size. */
const CAP_HEIGHT = 0.718

/**
 * Where to start the word so that its middle, after rotating, is the middle of the page. The text rotates around its
 * starting point, so half its width and height have to be rotated too. It is made smaller on a page it would not fit.
 */
export function centredStamp(font: PDFFont, box: { x: number; y: number; width: number; height: number }) {
  const radians = (STAMP_ANGLE * Math.PI) / 180
  const widthAt1 = font.widthOfTextAtSize(STAMP, 1)
  const extentAt1 = widthAt1 * Math.cos(radians) + CAP_HEIGHT * Math.sin(radians)
  const size = Math.min(150, (Math.min(box.width, box.height) * 0.85) / extentAt1)
  const halfWidth = (widthAt1 * size) / 2
  const halfHeight = (CAP_HEIGHT * size) / 2

  return {
    size,
    x: box.x + box.width / 2 - (halfWidth * Math.cos(radians) - halfHeight * Math.sin(radians)),
    y: box.y + box.height / 2 - (halfWidth * Math.sin(radians) + halfHeight * Math.cos(radians)),
    rotate: degrees(STAMP_ANGLE),
  }
}

/** The built-in PDF fonts only cover WinAnsi; any other character (₹, emoji, Indic scripts) would make drawing throw. */
function encodable(font: PDFFont, text: string) {
  const supported = new Set(font.getCharacterSet())
  return [...text.replace(/\s+/g, ' ')].map((char) => (supported.has(char.codePointAt(0)!) ? char : '?')).join('')
}

/** Cuts the line so it stays on the page. */
function fit(font: PDFFont, text: string, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let cut = text
  while (cut && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) cut = cut.slice(0, -1)
  return `${cut}...`
}

/** Returns a copy of the PDF with a VOID watermark (and the reason, when known) on every page. */
export async function stampVoid(pdf: Buffer | Uint8Array, reason?: string): Promise<Buffer> {
  const document = await PDFDocument.load(pdf)
  const font = await document.embedFont(StandardFonts.HelveticaBold)

  for (const page of document.getPages()) {
    // The visible area, which need not start at 0,0.
    const box = page.getCropBox()
    page.drawText(STAMP, { ...centredStamp(font, box), font, color: RED, opacity: 0.3 })
    if (reason) {
      const line = fit(font, encodable(font, `Void Reason: ${reason}`), 12, box.width - REASON_X * 2)
      page.drawText(line, { x: box.x + (box.width - font.widthOfTextAtSize(line, 12)) / 2, y: box.y + 30, size: 12, font, color: RED })
    }
  }

  return Buffer.from(await document.save())
}
