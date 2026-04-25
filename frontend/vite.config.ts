import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Routes to prerender for SEO and AI crawlers
const prerenderRoutes = [
  { route: '/' },
  { route: '/about' },
  { route: '/pricing' },
  { route: '/features' },
  { route: '/faq' },
  { route: '/contact' },
  { route: '/blog' },
  { route: '/docs' },
  { route: '/playground' },
  { route: '/signup' },
  { route: '/terms' },
  { route: '/privacy' },
  { route: '/login' },
  { route: '/docs/overview' },
  { route: '/docs/concepts' },
  { route: '/docs/quickstart' },
  { route: '/docs/api-reference' },
  { route: '/docs/webhooks' },
  { route: '/docs/integrations' },
  { route: '/docs/trust-law' },
  { route: '/docs/sdks' },
  { route: '/docs/aav-integration' },
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
    open: true,
  },
})