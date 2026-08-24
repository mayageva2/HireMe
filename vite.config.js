import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  const plugins = [
    react({
      include: '**/*.{jsx,js,tsx,ts}',
    }),
  ]

  if (command === 'serve') {
    const { devLivekitTokenPlugin } = await import('./vite/dev-livekit-token.js')
    const { devCvServicePlugin } = await import('./vite/dev-cv-service.js')
    plugins.push(devLivekitTokenPlugin())
    plugins.push(devCvServicePlugin())
  }

  return {
    plugins,
    root: resolve(__dirname, 'frontend'),
    css: {
      postcss: resolve(__dirname, 'frontend/postcss.config.js'),
    },
    ...(command === 'serve'
      ? {
          server: {
            // Avoid browser CORS on GetAvatarContext Lambda (duplicate Allow-Origin headers).
            proxy: {
              '/api/avatar-context': {
                target: 'https://tiqv7tglmz2hb4qmpjrimr5pge0anuak.lambda-url.us-east-1.on.aws',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/avatar-context\/?/, '/'),
              },
            },
          },
        }
      : {}),
  }
})
