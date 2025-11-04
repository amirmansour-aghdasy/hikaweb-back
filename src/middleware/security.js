import helmet from 'helmet';
import hpp from 'hpp';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    },
    // CSRF protection via SameSite cookies
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  hpp({ whitelist: ['sort', 'fields', 'page', 'limit', 'filter'] })
];

// CSRF protection is applied separately after authentication middleware
export { csrfProtection } from './csrf.js';