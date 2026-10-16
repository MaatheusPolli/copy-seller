import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** monta a API local (server/api.ts) via ssrLoadModule, que transpila o core em TS */
const api = (): Plugin => ({
  name: 'copy-seller-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) return next();
      const mod = await server.ssrLoadModule('/server/api.ts');
      await mod.handle(req, res, next);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), api()],
  ssr: { noExternal: ['@copy-seller/core'] },
});
