import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';
import mongoSanitize from 'express-mongo-sanitize';

export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: req.t('validation.failed'),
        errors: errorDetails
      });
    }

    req[property] = value;
    next();
  };
};

export const sanitizeHTML = (fields = []) => {
  return (req, res, next) => {
    try {
      const sanitizeOptions = {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        allowedAttributes: { 'a': ['href'] }
      };

      if (fields.length === 0) {
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = sanitizeHtml(req.body[key], sanitizeOptions);
          }
        }
      } else {
        fields.forEach(field => {
          if (req.body[field] && typeof req.body[field] === 'string') {
            req.body[field] = sanitizeHtml(req.body[field], sanitizeOptions);
          }
        });
      }
      next();
    } catch (error) {
      logger.error('HTML sanitization error:', error);
      next();
    }
  };
};

export const mongoSanitization = mongoSanitize({ replaceWith: '_' });