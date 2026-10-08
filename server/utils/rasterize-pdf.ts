// server/utils/rasterize-pdf.ts
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'

import 'pdfjs-dist/legacy/build/pdf.worker.mjs'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'

export interface RasterPage {
  png: Buffer
  width: number
  height: number
}

/** Rasterise every page of a PDF to PNG. `scale` 1 = 72 dpi (A4 = 595 x 842 px). */
export default async function rasterizePdfPages(pdfBuffer: Buffer | ArrayBuffer | Uint8Array, scale = 2): Promise<RasterPage[]> {
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer as ArrayBuffer) }).promise
  const pages: RasterPage[] = []

  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = createCanvas(viewport.width, viewport.height)

    await page.render({ canvasContext: canvas.getContext('2d') as any, canvas: null, viewport }).promise
    pages.push({ png: canvas.toBuffer('image/png'), width: Math.round(viewport.width), height: Math.round(viewport.height) })
  }

  return pages
}
