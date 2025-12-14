import { ArticleRating } from './model.js';
import { Article } from '../articles/model.js';
import { ArticleService } from '../articles/service.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

export class ArticleRatingService {
  // Generate user identifier from IP, user agent, and browser fingerprint (same as ArticleService)
  // This allows tracking unique ratings without requiring login (similar to WordPress)
  static generateUserIdentifier(req) {
    // Use the same method as ArticleService for consistency
    return ArticleService.generateUserIdentifier(req);
  }

  static async rateArticle(articleId, rating, userIdentifier, userId = null) {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('امتیاز باید بین ۱ تا ۵ باشد');
      }

      const article = await Article.findById(articleId);
      if (!article || article.deletedAt) {
        throw new Error('مقاله یافت نشد');
      }

      // Check if user already rated
      const existingRating = await ArticleRating.findOne({ 
        article: articleId, 
        userIdentifier 
      });

      let ratingDoc;
      if (existingRating) {
        // Update existing rating
        const oldRating = existingRating.rating;
        existingRating.rating = rating;
        existingRating.user = userId || null;
        await existingRating.save();
        ratingDoc = existingRating;

        // Update article ratings
        article.ratings.total = article.ratings.total - oldRating + rating;
        // count stays the same
      } else {
        // Create new rating
        ratingDoc = new ArticleRating({
          article: articleId,
          rating,
          userIdentifier,
          user: userId || null
        });
        await ratingDoc.save();

        // Update article ratings
        article.ratings.total += rating;
        article.ratings.count += 1;
      }

      // Calculate and save average
      article.calculateAverageRating();
      await article.save();

      return {
        rating: ratingDoc.rating,
        averageRating: article.ratings.average,
        totalRatings: article.ratings.count,
        isNewRating: !existingRating // Indicate if this is a new rating or an update
      };
    } catch (error) {
      logger.error('Rate article error:', error);
      throw error;
    }
  }

  static async getUserRating(articleId, userIdentifier) {
    try {
      const rating = await ArticleRating.findOne({ 
        article: articleId, 
        userIdentifier 
      });
      return rating ? rating.rating : null;
    } catch (error) {
      logger.error('Get user rating error:', error);
      return null;
    }
  }
}

