import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

await i18next.use(Backend).init({
  lng: 'fa',
  fallbackLng: 'fa',
  supportedLngs: ['fa', 'en'],
  backend: { loadPath: './src/locales/{{lng}}.json' },
  interpolation: { escapeValue: false }
});

export const i18nMiddleware = (req, res, next) => {
  let language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'fa';
  language = req.query.lang || language;
  
  if (!['fa', 'en'].includes(language)) {
    language = 'fa';
  }

  req.language = language;
  req.t = (key, options) => i18next.t(key, { lng: language, ...options });
  next();
};