import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const apiRoot = fileURLToPath(new URL('./api', import.meta.url));

const apiMiddlewarePlugin = () => ({
  name: 'vite-api-middleware',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/')) {
          return next();
        }

        const routePath = url.pathname.replace('/api/', '');
        const candidates = [
          path.join(apiRoot, routePath),
          path.join(apiRoot, `${routePath}.js`),
          path.join(apiRoot, routePath, 'index.js')
        ];
        const apiPath = candidates.find((candidate) => fs.existsSync(candidate));
        if (!apiPath) {
          return next();
        }

        const moduleUrl = pathToFileURL(apiPath).href;
        const apiModule = await import(moduleUrl + `?t=${Date.now()}`);
        const handler = apiModule.default;
        if (typeof handler !== 'function') {
          return next();
        }

        const request = {
          ...req,
          query: Object.fromEntries(url.searchParams),
          body: null,
        };

        const response = Object.create(res);
        response.status = (code) => {
          res.statusCode = code;
          return response;
        };
        response.json = (payload) => {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(JSON.stringify(payload));
          return response;
        };
        response.send = (payload) => {
          if (payload instanceof Buffer) {
            if (!res.headersSent && !res.hasHeader('Content-Type')) {
              res.setHeader('Content-Type', 'application/octet-stream');
            }
            res.end(payload);
          } else if (typeof payload === 'string') {
            res.end(payload);
          } else {
            if (!res.headersSent && !res.hasHeader('Content-Type')) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(payload));
          }
          return response;
        };

        await handler(request, response);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal API middleware error', message: err.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env = {
    ...process.env,
    ...env,
  };

  return {
    plugins: [react(), apiMiddlewarePlugin()],
  };
});
