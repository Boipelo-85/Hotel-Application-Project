// Compatibility factory for callers of the former alternate implementation.
import { createApp } from './app.js';
import { loadConfig, type AppConfig } from './config/env.js';
export function createSimpleApp(config: AppConfig = loadConfig()) { return createApp(config); }
