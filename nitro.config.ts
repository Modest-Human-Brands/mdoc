import { defineConfig } from 'nitro'
import Vue from 'unplugin-vue/rollup'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function compileTailwind(env: 'production' | 'development') {
  return () => {
    const assetsDir = path.resolve(process.cwd(), `${env === 'production' ? './.output/' : ''}public/assets`)
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true })
    }

    try {
      execSync(`bun tailwindcss -i ./assets/tailwind.css -o ${env === 'production' ? './.output/' : ''}public/assets/tailwind-compiled.css`, {
        stdio: 'inherit',
      })
    } catch (error) {
      console.error('❌ Failed to compile Tailwind CSS:', error)
    }
  }
}

export default defineConfig({
  compatibilityDate: '2026-04-17',
  rollupConfig: {
    plugins: [Vue()],
  },
  serverDir: './server',
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
  },
  hooks: {
    'build:before': compileTailwind('production'),
    'dev:start': compileTailwind('development'),
  },
})
