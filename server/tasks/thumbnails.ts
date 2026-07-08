import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import generatePdfThumbnail from '../utils/generate-pdf-thumbnail'

export default defineTask({
  meta: {
    name: 'backfill-thumbnails',
    description: 'Iterates over all PDFs in the fs storage and generates missing -preview.png thumbnails.',
  },
  async run({ payload }) {
    console.log('🚀 Starting thumbnail backfill task...')

    const fsStorage = useStorage('fs')

    // Get all keys (filenames) in the 'fs' storage
    const allKeys = await fsStorage.getKeys()

    // Filter only .pdf files
    const pdfKeys = allKeys.filter((key) => key.endsWith('.pdf'))
    console.log(`Found ${pdfKeys.length} total PDFs in storage.`)

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const pdfKey of pdfKeys) {
      const baseName = pdfKey.replace('.pdf', '')
      const previewKey = `${baseName}.png`

      // 1. Check if the preview already exists (unless a { force: true } payload was passed)
      const alreadyHasPreview = await fsStorage.hasItem(previewKey)
      if (alreadyHasPreview && !payload?.force) {
        console.log(`⏭️  Skipped ${baseName} (Thumbnail already exists)`)
        skippedCount++
        continue
      }

      console.log(`⏳ Generating thumbnail for ${baseName}...`)

      try {
        // 2. Read the PDF Buffer
        const pdfBuffer = await fsStorage.getItemRaw<Buffer>(pdfKey)
        if (!pdfBuffer) {
          throw new Error('Buffer is empty or could not be read.')
        }

        // 3. Generate the Thumbnail using your Rust-based canvas utility
        const pngBuffer = await generatePdfThumbnail(pdfBuffer)

        // 4. Save the Thumbnail back to storage
        await fsStorage.setItemRaw(previewKey, pngBuffer)

        console.log(`✅ Success: ${baseName}`)
        successCount++
      } catch (error) {
        console.error(`❌ Failed to process ${baseName}:`, error)
        errorCount++
      }
    }

    console.log('\n🎉 Thumbnails Task Complete!')
    console.log(`-------------------------`)
    console.log(`Successfully generated : ${successCount}`)
    console.log(`Skipped (existing)     : ${skippedCount}`)
    console.log(`Failed / Errors        : ${errorCount}`)

    return { result: 'success', successCount, skippedCount, errorCount }
  },
})
