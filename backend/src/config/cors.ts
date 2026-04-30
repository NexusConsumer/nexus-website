/**
 * Defines the backend CORS policy for HTTP routes and Socket.io.
 * The current policy is intentionally permissive while services are being split.
 * Restrict it later by replacing the permissive origin with an allow-list.
 */
import type { CorsOptions } from 'cors';

/** Allows every browser origin while still supporting credentialed API requests. */
export const httpCorsOptions: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-anonymous-id', 'x-agent-key'],
};

/** Allows Socket.io clients from any origin during the temporary split phase. */
export const socketCorsOptions = {
  origin: true,
  credentials: true,
} as const;
