import { ProductQuestionService } from './service.js';
import { logger } from '../../utils/logger.js';

/**
 * ProductQuestionController - Controller for product Q&A
 */
export class ProductQuestionController {
  /**
   * Ask a question
   * POST /api/v1/products/:id/questions
   */
  static async askQuestion(req, res, next) {
    try {
      const { question } = req.body;
      const { id: productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای پرسیدن سوال باید وارد شوید'
        });
      }

      if (!question || question.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'سوال باید حداقل 10 کاراکتر باشد'
        });
      }

      const productQuestion = await ProductQuestionService.askQuestion(
        productId,
        question,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'سوال شما ثبت شد و پس از تایید نمایش داده می‌شود',
        data: { question: productQuestion }
      });
    } catch (error) {
      logger.error('Ask question error:', error);
      next(error);
    }
  }

  /**
   * Answer a question
   * POST /api/v1/products/questions/:questionId/answers
   */
  static async answerQuestion(req, res, next) {
    try {
      const { answer } = req.body;
      const { questionId } = req.params;
      const userId = req.user?.id;
      const isVendor = req.user?.roles?.some(role => role.name === 'vendor' || role.name === 'admin') || false;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای پاسخ دادن باید وارد شوید'
        });
      }

      if (!answer || answer.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'پاسخ باید حداقل 10 کاراکتر باشد'
        });
      }

      const productQuestion = await ProductQuestionService.answerQuestion(
        questionId,
        answer,
        userId,
        isVendor
      );

      res.status(201).json({
        success: true,
        message: isVendor 
          ? 'پاسخ شما ثبت شد' 
          : 'پاسخ شما ثبت شد و پس از تایید نمایش داده می‌شود',
        data: { question: productQuestion }
      });
    } catch (error) {
      logger.error('Answer question error:', error);
      next(error);
    }
  }

  /**
   * Get product questions
   * GET /api/v1/products/:id/questions
   */
  static async getProductQuestions(req, res, next) {
    try {
      const { id: productId } = req.params;
      const result = await ProductQuestionService.getProductQuestions(
        productId,
        req.query
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Get product questions error:', error);
      next(error);
    }
  }

  /**
   * Get question by ID
   * GET /api/v1/products/questions/:questionId
   */
  static async getQuestionById(req, res, next) {
    try {
      const { questionId } = req.params;
      const question = await ProductQuestionService.getQuestionById(questionId);

      res.json({
        success: true,
        data: { question }
      });
    } catch (error) {
      logger.error('Get question by ID error:', error);
      next(error);
    }
  }

  /**
   * Vote question as helpful
   * POST /api/v1/products/questions/:questionId/helpful
   */
  static async voteHelpful(req, res, next) {
    try {
      const { questionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای رای دادن باید وارد شوید'
        });
      }

      const result = await ProductQuestionService.voteHelpful(questionId, userId);

      res.json({
        success: true,
        message: 'رای شما ثبت شد',
        data: result
      });
    } catch (error) {
      logger.error('Vote helpful error:', error);
      next(error);
    }
  }

  /**
   * Vote answer as helpful
   * POST /api/v1/products/questions/:questionId/answers/:answerId/helpful
   */
  static async voteAnswerHelpful(req, res, next) {
    try {
      const { questionId, answerId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای رای دادن باید وارد شوید'
        });
      }

      const result = await ProductQuestionService.voteAnswerHelpful(
        questionId,
        answerId,
        userId
      );

      res.json({
        success: true,
        message: 'رای شما ثبت شد',
        data: result
      });
    } catch (error) {
      logger.error('Vote answer helpful error:', error);
      next(error);
    }
  }

  /**
   * Delete question
   * DELETE /api/v1/products/questions/:questionId
   */
  static async deleteQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای حذف سوال باید وارد شوید'
        });
      }

      await ProductQuestionService.deleteQuestion(questionId, userId);

      res.json({
        success: true,
        message: 'سوال حذف شد'
      });
    } catch (error) {
      logger.error('Delete question error:', error);
      next(error);
    }
  }
}

