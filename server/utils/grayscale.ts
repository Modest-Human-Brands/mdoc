import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Instantly converts any raw SVG string into a grayscale SVG string.
 */
function convertToGrayscaleBackend(svgString: string): string {
  const filterId = `grayscale-${Math.random().toString(36).slice(2, 9)}`

  const filterXml = `
  <defs>
    <filter id="${filterId}">
      <feColorMatrix type="saturate" values="0" />
    </filter>
  </defs>`

  // Inject filter attribute into opening <svg> tag
  let modifiedSvg = svgString.replace(/<svg([^>]*)>/i, `<svg$1 filter="url(#${filterId})">`)

  // Inject <defs> block right after opening <svg> tag
  modifiedSvg = modifiedSvg.replace(/(<svg[^>]*>)/i, `$1${filterXml}`)

  return modifiedSvg
}

/**
 * Reads an SVG file from disk, converts it to grayscale, and saves it
 * with '-grayscaled' appended to the filename.
 * * @param inputFilePath - Path to the original SVG file (e.g., './assets/icon.svg')
 * @returns The path of the newly saved grayscaled file
 */
function saveGrayscaleSvgFile(inputFilePath: string): string {
  try {
    // 1. Resolve the absolute path and verify the file exists
    const resolvedInputPath = path.resolve(inputFilePath)
    if (!fs.existsSync(resolvedInputPath)) {
      throw new Error(`File not found: ${resolvedInputPath}`)
    }

    // 2. Read the raw SVG string from disk
    const originalSvgString = fs.readFileSync(resolvedInputPath, 'utf8')

    // 3. Apply the backend grayscale transformation
    const grayscaledSvgString = convertToGrayscaleBackend(originalSvgString)

    // 4. Construct the output filename (e.g., 'logo.svg' -> 'logo-grayscaled.svg')
    const parsedPath = path.parse(resolvedInputPath)
    const outputFilePath = path.join(parsedPath.dir, `${parsedPath.name}-grayscaled${parsedPath.ext}`)

    // 5. Save the modified SVG string to the new file
    fs.writeFileSync(outputFilePath, grayscaledSvgString, 'utf8')

    console.log(`✅ Success! Grayscale SVG saved to:\n   ${outputFilePath}`)
    return outputFilePath
  } catch (error) {
    console.error(`❌ Error processing SVG:`, error instanceof Error ? error.message : error)
    throw error
  }
}

// ==========================================
// EXAMPLE USAGE:
// ==========================================

// Pass the relative or absolute path to your SVG file
saveGrayscaleSvgFile('./asset/internship-completion-certificate-v1_0001.svg')
