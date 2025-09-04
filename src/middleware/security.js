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
    }
  }),
  hpp({ whitelist: ['sort', 'fields', 'page', 'limit', 'filter'] })
];