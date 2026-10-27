import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Serve static assets from the Vite build output
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint for Cloud Run and container readiness
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Remix Tangkhul Village Directory',
    timestamp: new Date().toISOString(),
  });
});

// Single Page Application (SPA) fallback to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
