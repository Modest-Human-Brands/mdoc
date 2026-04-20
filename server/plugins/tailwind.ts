import { definePlugin } from 'nitro'
import { useStorage } from 'nitro/storage'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import fs from 'node:fs/promises'
import path from 'node:path'

export default definePlugin(async () => {
  console.log('🚀 Nitro Plugin: Starting Tailwind CSS in-memory compilation...')
  const storage = useStorage()

  try {
    const cssPath = path.resolve(process.cwd(), './assets/tailwind.css')
    const cssContent = await fs.readFile(cssPath, 'utf8')

    const result = await postcss([tailwindcss()]).process(cssContent, {
      from: cssPath,
    })
    await storage.setItem('assets:tailwind-compiled.css', result.css)

    console.log('✅ Tailwind CSS compiled and stored in Nitro memory.')
  } catch (error) {
    console.error('❌ Failed to compile Tailwind CSS in plugin:', error)
  }
})
