import { Banner } from './model.js';
import { Media } from '../media/model.js';
import { logger } from '../../utils/logger.js';

export class BannerService {
  static async createBanner(bannerData, userId) {
    try {
      const banner = new Banner({
        ...bannerData,
        createdBy: userId
      });

      await banner.save();

      // Track image usage
      if (banner.image) {
        await this.trackImageUsage(banner.image, banner._id, 'image');
      }
      if (banner.mobileImage) {
        await this.trackImageUsage(banner.mobileImage, banner._id, 'mobileImage');
      }

      logger.info(`Banner created: ${banner.title?.fa || banner._id} by user ${userId}`);
      return banner;
    } catch (error) {
      logger.error('Banner creation error:', error);
      throw error;
    }
  }

  static async updateBanner(bannerId, updateData, userId) {
    try {
      const banner = await Banner.findById(bannerId);

      if (!banner) {
        throw new Error('بنر یافت نشد');
      }

      // Track image changes
      if (updateData.image !== banner.image) {
        if (banner.image) {
          await this.removeImageUsage(banner.image, banner._id, 'image');
        }
        if (updateData.image) {
          await this.trackImageUsage(updateData.image, banner._id, 'image');
        }
      }

      if (updateData.mobileImage !== banner.mobileImage) {
        if (banner.mobileImage) {
          await this.removeImageUsage(banner.mobileImage, banner._id, 'mobileImage');
        }
        if (updateData.mobileImage) {
          await this.trackImageUsage(updateData.mobileImage, banner._id, 'mobileImage');
        }
      }

      Object.assign(banner, updateData);
      banner.updatedBy = userId;

      await banner.save();

      logger.info(`Banner updated: ${banner.title?.fa || banner._id} by user ${userId}`);
      return banner;
    } catch (error) {
      logger.error('Banner update error:', error);
      throw error;
    }
  }

  static async deleteBanner(bannerId, userId) {
    try {
      const banner = await Banner.findById(bannerId);

      if (!banner) {
        throw new Error('بنر یافت نشد');
      }

      await banner.softDelete();
      banner.updatedBy = userId;
      await banner.save();

      // Remove image usage tracking
      if (banner.image) {
        await this.removeImageUsage(banner.image, banner._id, 'image');
      }
      if (banner.mobileImage) {
        await this.removeImageUsage(banner.mobileImage, banner._id, 'mobileImage');
      }

      logger.info(`Banner deleted: ${banner.title?.fa || banner._id} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Banner deletion error:', error);
      throw error;
    }
  }

  static async getBanners(filters = {}) {
    try {
      const { 
        position = '', 
        isActive = '', 
        search = '', 
        language = 'fa',
        page = 1,
        limit = 25
      } = filters;

      let query = { deletedAt: null };

      if (position) query.position = position;
      if (isActive !== '') query.isActive = isActive === 'true';

      if (search) {
        query.$or = [
          { [`title.${language}`]: new RegExp(search, 'i') },
          { [`description.${language}`]: new RegExp(search, 'i') }
        ];
      }

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;
      const skip = (parsedPage - 1) * parsedLimit;

      const [banners, total] = await Promise.all([
        Banner.find(query)
          .sort({ position: 1, orderIndex: 1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        Banner.countDocuments(query)
      ]);

      return {
        data: banners,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: skip + parsedLimit < total,
          hasPrev: parsedPage > 1
        }
      };
    } catch (error) {
      logger.error('Get banners error:', error);
      throw error;
    }
  }

  static async getBannerById(bannerId) {
    try {
      const banner = await Banner.findOne({
        _id: bannerId,
        deletedAt: null
      }).lean();

      if (!banner) {
        throw new Error('بنر یافت نشد');
      }

      return banner;
    } catch (error) {
      logger.error('Get banner by ID error:', error);
      throw error;
    }
  }

  static async getActiveBanners(position) {
    try {
      const now = new Date();
      const query = {
        deletedAt: null,
        status: 'active',
        isActive: true,
        position: position || 'home-page-banners',
        $or: [
          { 'schedule.isScheduled': false },
          {
            'schedule.isScheduled': true,
            'schedule.startDate': { $lte: now },
            'schedule.endDate': { $gte: now }
          }
        ]
      };

      const banners = await Banner.find(query)
        .sort({ orderIndex: 1 })
        .lean();

      return banners;
    } catch (error) {
      logger.error('Get active banners error:', error);
      throw error;
    }
  }

  static async updateOrder(bannerIds, userId) {
    try {
      const updates = bannerIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { 
            $set: { 
              orderIndex: index,
              updatedBy: userId
            } 
          }
        }
      }));

      await Banner.bulkWrite(updates);
      logger.info(`Banner order updated by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Update banner order error:', error);
      throw error;
    }
  }

  // Track image usage in media library
  static async trackImageUsage(imageUrl, resourceId, fieldName) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        media.usageCount += 1;
        media.usedIn.push({
          resourceType: 'Banner',
          resourceId,
          fieldName,
          usedAt: new Date()
        });
        await media.save();
      }
    } catch (error) {
      logger.warn(`Failed to track image usage: ${error.message}`);
    }
  }

  // Remove image usage tracking
  static async removeImageUsage(imageUrl, resourceId, fieldName) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        media.usageCount = Math.max(0, media.usageCount - 1);
        media.usedIn = media.usedIn.filter(
          usage => !(usage.resourceType === 'Banner' && 
                     usage.resourceId.toString() === resourceId.toString() && 
                     usage.fieldName === fieldName)
        );
        await media.save();
      }
    } catch (error) {
      logger.warn(`Failed to remove image usage: ${error.message}`);
    }
  }
}

