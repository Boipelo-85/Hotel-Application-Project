import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { notFoundMiddleware } from './middleware/notFoundMiddleware.js';
import { requestLoggerMiddleware } from './middleware/requestLoggerMiddleware.js';
import { apiSimpleRoutes } from './routes/index-simple.js';

export function createSimpleApp(): Express {
  const app = express();

  app.use(requestLoggerMiddleware);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
  app.use('/api', apiSimpleRoutes());
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
