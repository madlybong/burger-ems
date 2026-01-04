import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    root: '.',
    plugins: [
        vue(),
        vuetify({ autoImport: true }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/ui'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8765',
                changeOrigin: true,
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
})
