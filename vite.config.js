import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: { proxy: { '/api': { target: loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } } },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
}))
