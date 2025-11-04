import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const noAttr = () => {
  return {
    name: "no-attribute",
    transformIndexHtml(html: string) {
      return html.replace(`type="module" crossorigin`, "defer").replace(`crossorigin `, "");
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), noAttr()],
  build: {
    outDir: './dist',
    assetsDir: './'
  },
  base: './',
  publicDir: 'public'
})
