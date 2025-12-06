import { Router } from 'express';
import { ArticleRatingController } from './controller.js';
import { optionalAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import Joi from 'joi';

const router = Router();

const rateArticleSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'any.required': 'امتیاز الزامی است',
    'number.min': 'امتیاز باید حداقل ۱ باشد',
    'number.max': 'امتیاز نمی‌تواند بیش از ۵ باشد'
  })
});

// Public routes (optional auth for logged-in users)
router.use(optionalAuth);

router.post('/:id', validate(rateArticleSchema), ArticleRatingController.rateArticle);
router.get('/:id/user-rating', ArticleRatingController.getUserRating);

export default router;

