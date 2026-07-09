import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'

import 'pdfjs-dist/legacy/build/pdf.worker.mjs'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'

export default async function (pdfBuffer: Buffer | ArrayBuffer | Uint8Array, scale: number = 1.5): Promise<Buffer> {
  const pdfDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer as ArrayBuffer),
  }).promise

  const page = await pdfDoc.getPage(1)
  const viewport = page.getViewport({ scale })

  const canvas = createCanvas(viewport.width, viewport.height)
  const ctx = canvas.getContext('2d')

  await page.render({
    canvasContext: ctx as any,
    canvas: null,
    viewport,
  }).promise

  return canvas.toBuffer('image/png')
}
