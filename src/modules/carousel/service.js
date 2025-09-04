import { Carousel } from './model.js';
import { Media } from '../media/model.js';
import { logger } from '../../utils/logger.js';

export class CarouselService {
  static async createCarousel(carouselData, userId) {
    try {
      const carousel = new Carousel({
        ...carouselData,
        createdBy: userId
      });

      await carousel.save();

      // Track image usage
      if (carousel.image) {
        await this.trackImageUsage(carousel.image, carousel._id, 'image');
      }
      if (carousel.mobileImage) {
        await this.trackImageUsage(carousel.mobileImage, carousel._id, 'mobileImage');
      }

      logger.info(`Carousel created: ${carousel.title.fa} by user ${userId}`);
      return carousel;
    } catch (error) {
      logger.error('Carousel creation error:', error);
      throw error;
    }
  }

  static async updateCarousel(carouselId, updateData, userId) {
    try {
      const carousel = await Carousel.findById(carouselId);

      if (!carousel) {
        throw new Error('اسلاید یافت نشد');
      }

      // Track image changes
      if (updateData.image !== carousel.image) {
        if (carousel.image) {
          await this.removeImageUsage(carousel.image, carousel._id, 'image');
        }
        if (updateData.image) {
          await this.trackImageUsage(updateData.image, carousel._id, 'image');
        }
      }

      if (updateData.mobileImage !== carousel.mobileImage) {
        if (carousel.mobileImage) {
          await this.removeImageUsage(carousel.mobileImage, carousel._id, 'mobileImage');
        }
        if (updateData.mobileImage) {
          await this.trackImageUsage(updateData.mobileImage, carousel._id, 'mobileImage');
        }
      }

      Object.assign(carousel, updateData);
      carousel.updatedBy = userId;

      await carousel.save();

      logger.info(`Carousel updated: ${carousel.title.fa} by user ${userId}`);
      return carousel;
    } catch (error) {
      logger.error('Carousel update error:', error);
      throw error;
    }
  }

  static async deleteCarousel(carouselId, userId) {
    try {
      const carousel = await Carousel.findById(carouselId);

      if (!carousel) {
        throw new Error('اسلاید یافت نشد');
      }

      await carousel.softDelete();
      carousel.updatedBy = userId;
      await carousel.save();

      // Remove image usage tracking
      if (carousel.image) {
        await this.removeImageUsage(carousel.image, carousel._id, 'image');
      }
      if (carousel.mobileImage) {
        await this.removeImageUsage(carousel.mobileImage, carousel._id, 'mobileImage');
      }

      logger.info(`Carousel deleted: ${carousel.title.fa} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Carousel deletion error:', error);
      throw error;
    }
  }

  static async getCarousels(filters = {}) {
    try {
      const { position = '', isVisible = '', search = '', language = 'fa' } = filters;

      let query = { deletedAt: null };

      if (position) query.position = position;
      if (isVisible !== '') query.isVisible = isVisible === 'true';

      if (search) {
        query.$or = [
          { [`title.${language}`]: new RegExp(search, 'i') },
          { [`description.${language}`]: new RegExp(search, 'i') }
        ];
      }

      const carousels = await Carousel.find(query).sort({ position: 1, orderIndex: 1 });

      return carousels;
    } catch (error) {
      logger.error('Get carousels error:', error);
      throw error;
    }
  }

  static async getActiveCarousels(position = 'home') {
    try {
      const now = new Date();

      const carousels = await Carousel.find({
        position,
        isVisible: true,
        deletedAt: null,
        $or: [
          { 'schedule.isScheduled': false },
          {
            'schedule.isScheduled': true,
            'schedule.startDate': { $lte: now },
            'schedule.endDate': { $gte: now }
          }
        ]
      }).sort({ orderIndex: 1 });

      return carousels;
    } catch (error) {
      logger.error('Get active carousels error:', error);
      return [];
    }
  }

  static async trackImageUsage(imageUrl, carouselId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.trackUsage('Carousel', carouselId, field);
      }
    } catch (error) {
      logger.error('Track image usage error:', error);
    }
  }

  static async removeImageUsage(imageUrl, carouselId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.removeUsage('Carousel', carouselId, field);
      }
    } catch (error) {
      logger.error('Remove image usage error:', error);
    }
  }
}
