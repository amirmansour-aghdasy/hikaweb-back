import { Router } from 'express';
import { ProductQuestionController } from './controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { csrfProtection } from '../../middleware/security.js';
import { validate, sanitizeHTML } from '../../middleware/validation.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { askQuestionSchema, answerQuestionSchema } from './validation.js';

// Rate limiters for Q&A
const questionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 questions per 15 minutes
  message: 'تعداد سوالات بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:question:'
});

const answerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 answers per 15 minutes
  message: 'تعداد پاسخ‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:answer:'
});

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Product Questions
 *   description: Product Q&A management endpoints
 */

/**
 * Note: GET /:id/questions route is mounted in products/routes.js before authenticate
 * to ensure public access. This route definition is kept for documentation purposes.
 * 
 * @swagger
 * /api/v1/products/{id}/questions:
 *   get:
 *     summary: Get product questions
 *     tags: [Product Questions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 */
// Route moved to products/routes.js for public access
// router.get('/:id/questions', optionalAuth, ProductQuestionController.getProductQuestions);

/**
 * @swagger
 * /api/v1/products/{id}/questions:
 *   post:
 *     summary: Ask a question
 *     tags: [Product Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Question asked successfully
 */
router.post(
  '/:id/questions',
  authenticate,
  csrfProtection,
  questionLimiter,
  validate(askQuestionSchema),
  sanitizeHTML(['question']),
  ProductQuestionController.askQuestion
);

/**
 * @swagger
 * /api/v1/products/questions/{questionId}:
 *   get:
 *     summary: Get question by ID
 *     tags: [Product Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question retrieved successfully
 */
router.get('/questions/:questionId', optionalAuth, ProductQuestionController.getQuestionById);

/**
 * @swagger
 * /api/v1/products/questions/{questionId}/answers:
 *   post:
 *     summary: Answer a question
 *     tags: [Product Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answer
 *             properties:
 *               answer:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Answer posted successfully
 */
router.post(
  '/questions/:questionId/answers',
  authenticate,
  csrfProtection,
  answerLimiter,
  validate(answerQuestionSchema),
  sanitizeHTML(['answer']),
  ProductQuestionController.answerQuestion
);

/**
 * @swagger
 * /api/v1/products/questions/{questionId}/helpful:
 *   post:
 *     summary: Vote question as helpful
 *     tags: [Product Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 */
router.post('/questions/:questionId/helpful', authenticate, csrfProtection, ProductQuestionController.voteHelpful);

/**
 * @swagger
 * /api/v1/products/questions/{questionId}/answers/{answerId}/helpful:
 *   post:
 *     summary: Vote answer as helpful
 *     tags: [Product Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: answerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 */
router.post('/questions/:questionId/answers/:answerId/helpful', authenticate, csrfProtection, ProductQuestionController.voteAnswerHelpful);

/**
 * @swagger
 * /api/v1/products/questions/{questionId}:
 *   delete:
 *     summary: Delete question
 *     tags: [Product Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question deleted successfully
 */
router.delete('/questions/:questionId', authenticate, ProductQuestionController.deleteQuestion);

export default router;

