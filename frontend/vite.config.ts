import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('leaflet')) {
            return 'leaflet-vendor';
          }

          if (id.includes('@ant-design/icons') || id.includes('@ant-design/icons-svg')) {
            return 'icon-vendor';
          }

          if (id.includes('@ant-design/cssinjs') || id.includes('@ant-design/colors') || id.includes('@ctrl/tinycolor')) {
            return 'antd-style-vendor';
          }

          if (id.includes('dayjs')) {
            return 'dayjs-vendor';
          }

          if (
            id.includes('rc-field-form') ||
            id.includes('rc-picker') ||
            id.includes('rc-table') ||
            id.includes('rc-tree') ||
            id.includes('rc-virtual-list') ||
            id.includes('rc-select') ||
            id.includes('rc-upload')
          ) {
            return 'antd-heavy-vendor';
          }

          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
            return 'antd-vendor';
          }

          if (id.includes('react-dom') || id.includes('react-router') || id.includes('react-redux') || id.includes('@reduxjs')) {
            return 'react-vendor';
          }

          if (id.includes('axios') || id.includes('lodash')) {
            return 'utils-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
