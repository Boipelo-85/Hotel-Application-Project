import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';

import type { AppConfig } from './config/env.js';

import { createSameOriginMiddleware } from './middleware/authMiddleware.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { notFoundMiddleware } from './middleware/notFoundMiddleware.js';
import { requestLoggerMiddleware } from './middleware/requestLoggerMiddleware.js';

import { apiRoutes } from './routes/index.js';
import { configurePassport } from './config/passport.js';

const API_PREFIX = '/api/v1';

const ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
] as const;

export function createApp(config: AppConfig): Express {
  const app = express();

  // Configure Passport for OAuth
  configurePassport(config);
  app.use(passport.initialize());

  const cookieName =
    config.NODE_ENV === 'production'
      ? '__Host-hotel_session'
      : 'hotel_session';

  const sameOrigin = createSameOriginMiddleware(
    config.APP_ORIGIN,
  );

  app.disable('x-powered-by');

  app.use(requestLoggerMiddleware);

  app.use(
    helmet(),
  );

  app.use(
    cors({
      origin: config.APP_ORIGIN,
      credentials: true,
      methods: [...ALLOWED_METHODS],
      allowedHeaders: [
        'Content-Type',
        'Idempotency-Key',
        'Payment-Signature',
      ],
    }),
  );

  // Payment webhooks require the raw body
  // for signature verification
  app.use(
    `${API_PREFIX}/payments/webhook`,
    express.raw({
      type: 'application/json',
      limit: '1mb',
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(API_PREFIX, (request, _response, next) => {
    const protectedMethods = [
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ];

    if (
      protectedMethods.includes(request.method) &&
      !request.path.startsWith('/payments/webhook')
    ) {
      return sameOrigin( request, _response, next,);
    }

    next();
  });

  app.use(API_PREFIX,apiRoutes(config, cookieName),);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}