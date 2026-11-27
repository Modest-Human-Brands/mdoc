import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from 'pdf-lib'

const RED = rgb(1, 0, 0)
const REASON_X = 80

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
    const { width, height } = page.getSize()
    const size = 150
    page.drawText('VOID', {
      x: width / 2 - font.widthOfTextAtSize('VOID', size) / 2,
      y: height / 2 - font.heightAtSize(size) / 2,
      size,
      font,
      color: RED,
      opacity: 0.3,
      rotate: degrees(45),
    })
    if (reason) {
      const line = fit(font, encodable(font, `Void Reason: ${reason}`), 12, width - REASON_X * 2)
      page.drawText(line, { x: REASON_X, y: 30, size: 12, font, color: RED })
    }
  }

  return Buffer.from(await document.save())
}
