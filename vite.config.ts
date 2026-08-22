import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react()].filter(Boolean),
  build: {
    modulePreload: {
      resolveDependencies: (_hostId, deps) => deps.filter((dependency) => !dependency.includes('markdown-vendor')),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist')) return 'pdf-vendor';
          if (id.includes('node_modules/@livekit') || id.includes('node_modules/livekit-client')) return 'livekit-vendor';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react-vendor';
          if (id.includes('node_modules/@radix-ui')) return 'radix-vendor';
          if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/react-query')) return 'query-vendor';
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform') || id.includes('node_modules/zod')) return 'forms-vendor';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/unified') || id.includes('node_modules/hast')) return 'markdown-vendor';
          if (id.includes('node_modules/recharts')) return 'charts-vendor';
          if (id.includes('node_modules/date-fns')) return 'date-vendor';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
