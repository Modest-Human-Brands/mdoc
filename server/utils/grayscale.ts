import * as fs from 'node:fs'
import * as path from 'node:path'

function convertToGrayscaleBackend(svgString: string): string {
  const filterId = `grayscale-${Math.random().toString(36).slice(2, 9)}`

  const filterXml = `
  <defs>
    <filter id="${filterId}">
      <feColorMatrix type="saturate" values="0" />
    </filter>
  </defs>`

  let modifiedSvg = svgString.replace(/<svg([^>]*)>/i, `<svg$1 filter="url(#${filterId})">`)

  modifiedSvg = modifiedSvg.replace(/(<svg[^>]*>)/i, `$1${filterXml}`)

  return modifiedSvg
}

function saveGrayscaleSvgFile(inputFilePath: string): string {
  try {
    const resolvedInputPath = path.resolve(inputFilePath)
    if (!fs.existsSync(resolvedInputPath)) {
      throw new Error(`File not found: ${resolvedInputPath}`)
    }

    const originalSvgString = fs.readFileSync(resolvedInputPath, 'utf8')

    const grayscaledSvgString = convertToGrayscaleBackend(originalSvgString)

    const parsedPath = path.parse(resolvedInputPath)
    const outputFilePath = path.join(parsedPath.dir, `${parsedPath.name}-grayscaled${parsedPath.ext}`)

    fs.writeFileSync(outputFilePath, grayscaledSvgString, 'utf8')

    return outputFilePath
  } catch (error) {
    console.error(`❌ Error processing SVG:`, error instanceof Error ? error.message : error)
    throw error
  }
}

saveGrayscaleSvgFile('./asset/internship-completion-certificate-v1_0001.svg')
