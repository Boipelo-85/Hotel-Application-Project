import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { createSameOriginMiddleware } from './middleware/authMiddleware.js';
import { notFoundMiddleware } from './middleware/notFoundMiddleware.js';
import { requestLoggerMiddleware } from './middleware/requestLoggerMiddleware.js';
import { apiRoutes } from './routes/index.js';

export function createApp(config: AppConfig): Express {
  const app = express();
  const cookieName = config.NODE_ENV === 'production' ? '__Host-hotel_session' : 'hotel_session';
  const sameOrigin = createSameOriginMiddleware(config.APP_ORIGIN);

  app.use(requestLoggerMiddleware);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: config.APP_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Idempotency-Key', 'Payment-Signature'],
  }));
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
  app.use('/api/v1', (request, _response, next) => {
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
      !request.path.startsWith('/payments/webhook')
    ) {
      sameOrigin(request, _response, next);
      return;
    }
    next();
  });
  app.use('/api/v1', apiRoutes(config, cookieName));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
