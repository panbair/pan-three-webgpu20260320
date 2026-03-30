import { loadEnv, type PluginOption } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { createHtmlPlugin } from 'vite-plugin-html'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { ConfigEnv } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
export default ({ mode }: ConfigEnv) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const isBuild = mode === 'production' || mode === 'prod'

  return {
    base: env.VITE_BASE_PATH,
    plugins: [
      wasm(),
      topLevelAwait(),
      Vue(),
      VueJsx(),
      UnoCSS(),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia',
          {
            'vue-i18n': ['useI18n']
          }
        ],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: {
          enabled: false
        }
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/components.d.ts',
        extensions: ['vue', 'tsx'],
        include: [/\.vue$/, /\.vue\?vue/, /\.tsx$/],
        exclude: [/[\\/]node_modules[\\/]/, /[\\/]\\.git[\\/]/, /[\\/]\\.nuxt[\\/]/]
      }),
      createHtmlPlugin({
        minify: true,
        template: 'index.html'
      }),
      // Gzip 压缩
      viteCompression({
        verbose: true,
        disable: !isBuild,
        threshold: 10240,
        algorithm: 'gzip',
        ext: '.gz'
      }),
      // 打包体积分析
      isBuild &&
        visualizer({
          open: false,
          gzipSize: true,
          brotliSize: true,
          filename: 'dist/stats.html'
        })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'vue-i18n': 'vue-i18n/dist/vue-i18n.cjs.js'
        // 以下 alias 指向的源码目录不完整，已注释
        // 'three': path.resolve(__dirname, './src/views/Home/源码/three.js-dev (1)/three.js-dev/build/three.webgpu.js'),
        // 'three/webgpu': path.resolve(__dirname, './src/views/Home/源码/three.js-dev (1)/three.js-dev/build/three.webgpu.js'),
        // 'three/tsl': path.resolve(__dirname, './src/views/Home/源码/three.js-dev (1)/three.js-dev/build/three.tsl.js'),
        // 'three/addons/': path.resolve(__dirname, './src/views/Home/源码/three.js-dev (1)/three.js-dev/examples/jsm/')
      },
      optimizeDeps: {
        include: [
          'vue',
          'vue-router',
          'pinia',
          'element-plus',
          'axios',
          'dayjs',
          '@dimforge/rapier3d'
        ],
        exclude: ['@dimforge/rapier3d']
      }
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT) || 5173,
      open: env.VITE_OPEN === 'true',
      hmr: {
        overlay: true
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          ws: true
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;',
          javascriptEnabled: true
        }
      }
    },
    build: {
      target: 'es2022',
      outDir: env.VITE_OUT_DIR || 'dist',
      assetsDir: 'assets',
      sourcemap: env.VITE_SOURCEMAP === 'true',
      minify: 'terser',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: '[ext]/[name]-[hash].[ext]',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('vue')) {
                return 'vue-vendor'
              }
              if (id.includes('vue-router')) {
                return 'vue-router'
              }
              if (id.includes('pinia')) {
                return 'pinia'
              }
              if (id.includes('element-plus') || id.includes('@element-plus')) {
                return 'element-plus'
              }
              if (id.includes('vue-i18n') || id.includes('@intlify')) {
                return 'i18n'
              }
              return 'vendor'
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  }
}
