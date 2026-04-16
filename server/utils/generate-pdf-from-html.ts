import { spawn } from 'node:child_process'

/**
 * Takes an HTML string and pipes it to WeasyPrint to generate a PDF.
 * @param html The fully rendered HTML string
 */
export default async function (html: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn('weasyprint', ['-', '-'])
    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []

    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', (chunk) => errChunks.push(chunk))

    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks))
      } else {
        console.warn('WeasyPrint Stderr:', Buffer.concat(errChunks).toString())
        reject(new Error(`WeasyPrint process exited with code ${code}`))
      }
    })

    child.on('error', (err) => {
      console.error('Failed to start WeasyPrint process:', err)
      reject(err)
    })

    child.stdin.write(html)
    child.stdin.end()
  })
}
