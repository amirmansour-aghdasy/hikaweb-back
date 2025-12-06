import { ArticleRatingService } from './service.js';

export class ArticleRatingController {
  static async rateArticle(req, res, next) {
    try {
      const { rating } = req.body;
      const userIdentifier = ArticleRatingService.generateUserIdentifier(req);
      const userId = req.user?.id || null;

      const result = await ArticleRatingService.rateArticle(
        req.params.id,
        rating,
        userIdentifier,
        userId
      );

      res.json({
        success: true,
        message: 'امتیاز شما ثبت شد',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserRating(req, res, next) {
    try {
      const userIdentifier = ArticleRatingService.generateUserIdentifier(req);
      const rating = await ArticleRatingService.getUserRating(req.params.id, userIdentifier);

      res.json({
        success: true,
        data: { rating }
      });
    } catch (error) {
      next(error);
    }
  }
}

