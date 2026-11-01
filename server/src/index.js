import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import jobRoutes from './routes/jobs.js';
import { startCleanup } from './services/cleanup.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', jobRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] http://localhost:${config.port}`);
  startCleanup();
});
