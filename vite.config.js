import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

function excludeLocalStudioV2Audio() {
  let outputDirectory = ''
  return {
    name: 'exclude-local-studio-v2-audio',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      await Promise.all([
        rm(resolve(outputDirectory, 'audio/fred-studio/catalog.local.json'), { force: true }),
        rm(resolve(outputDirectory, 'audio/fred-studio/catalog.example.json'), { force: true }),
        rm(resolve(outputDirectory, 'audio/fred-studio/README.md'), { force: true }),
        rm(resolve(outputDirectory, 'audio/fred-studio/tracks/local'), {
          force: true,
          recursive: true,
        }),
      ])
    },
  }
}

export default defineConfig({
  plugins: [react(), excludeLocalStudioV2Audio()],
  base: '/',
})
