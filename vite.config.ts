import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

/**
 * Dev only. Mientras el agente trabaja en un turno (`/__dhd/hold`, lo llama un hook de Claude Code) se
 * retienen las recargas por HMR; al terminar (`/__dhd/release`) se manda UN full-reload a todos los
 * navegadores conectados, y solo si hubo cambios de código. Sin `hold`, Vite se comporta como siempre.
 * Ver .claude/tools/refresh/refresh.mjs y .claude/settings.json.
 */
function agentRefresh(): Plugin {
  const MAX_HOLD_MS = 10 * 60_000; // por si un turno se corta y nunca llega el release
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let holding = false;
  let dirty = false;
  return {
    name: 'dhd-agent-refresh',
    apply: 'serve',
    configureServer(server) {
      const stop = () => {
        holding = false;
        clearTimeout(holdTimer);
      };
      server.middlewares.use('/__dhd', (req, res) => {
        const action = (req.url ?? '').replace(/^\//, '').split('?')[0];
        let body = '';
        if (req.method !== 'POST') {
          res.statusCode = 405;
        } else if (action === 'hold') {
          stop();
          holding = true;
          dirty = false;
          holdTimer = setTimeout(stop, MAX_HOLD_MS);
          body = 'holding';
        } else if (action === 'release') {
          const reload = dirty;
          stop();
          dirty = false;
          if (reload) server.ws.send({ type: 'full-reload' });
          body = reload ? 'reloaded' : 'no changes';
        } else {
          res.statusCode = 404;
        }
        res.end(body);
      });
    },
    handleHotUpdate() {
      if (!holding) return;
      dirty = true;
      return []; // sin HMR: el reload llega al terminar el turno
    },
  };
}

// base './' → the static build works from any sub-path (GitHub Pages, etc.)
export default defineConfig({
  base: './',
  plugins: [react(), agentRefresh()],
  // `npm run tunnel` serves the dev server through a *.trycloudflare.com host (HTTPS: needed for the accelerometer)
  server: { allowedHosts: ['.trycloudflare.com'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
