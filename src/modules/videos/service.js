import { Video } from './model.js';
import { VideoView } from './videoViewModel.js';
import { VideoLike } from './videoLikeModel.js';
import { VideoBookmark } from './videoBookmarkModel.js';
import { Article } from '../articles/model.js';
import { Portfolio } from '../portfolio/model.js';
import { Service } from '../services/model.js';
import { Comment } from '../comments/model.js';
import { logger } from '../../utils/logger.js';
import { BaseService } from '../../shared/services/baseService.js';
import crypto from 'crypto';

export class VideoService extends BaseService {
  constructor() {
    super(Video, {
      cachePrefix: 'videos',
      slugField: 'title',
      categoryType: 'video',
      populateFields: ['author', 'categories'],
      imageFields: {
        thumbnailUrl: 'thumbnailUrl'
      }
    });
  }
  static async createVideo(videoData, userId) {
    try {
      // Auto-generate slugs if not provided
      if (!videoData.slug || !videoData.slug.fa || !videoData.slug.en) {
        const generatedSlugs = generateSlugs(videoData.title);
        videoData.slug = {
          fa: videoData.slug?.fa || generatedSlugs.fa,
          en: videoData.slug?.en || generatedSlugs.en
        };
      }

      // Ensure slugs are unique
      const checkDuplicateFa = async (slug) => {
        const exists = await Video.findOne({ 'slug.fa': slug, deletedAt: null });
        return !!exists;
      };
      
      const checkDuplicateEn = async (slug) => {
        const exists = await Video.findOne({ 'slug.en': slug, deletedAt: null });
        return !!exists;
      };

      videoData.slug.fa = await ensureUniqueSlug(checkDuplicateFa, videoData.slug.fa);
      videoData.slug.en = await ensureUniqueSlug(checkDuplicateEn, videoData.slug.en);

      // Validate categories exist
      if (videoData.categories && videoData.categories.length > 0) {
        const categoriesCount = await Category.countDocuments({
          _id: { $in: videoData.categories },
          type: 'video',
          deletedAt: null
        });

        if (categoriesCount !== videoData.categories.length) {
          throw new Error('برخی از دسته‌بندی‌های انتخابی نامعتبر هستند');
        }
      }

      // Auto-populate related content based on categories and tags
      const categoryIds = videoData.categories || [];
      const videoTags = [
        ...(videoData.tags?.fa || []),
        ...(videoData.tags?.en || [])
      ];

      // Find related services (same categories)
      const relatedServices = await Service.find({
        categories: { $in: categoryIds },
        deletedAt: null,
        status: 'active'
      })
        .limit(4)
        .select('_id');

      // Find related portfolios (same categories)
      const relatedPortfolios = await Portfolio.find({
        categories: { $in: categoryIds },
        deletedAt: null,
        isPublished: true
      })
        .limit(4)
        .select('_id');

      // Find related articles (same categories or matching tags)
      const relatedArticles = await Article.find({
        $or: [
          { categories: { $in: categoryIds } },
          { 'tags.fa': { $in: videoTags } },
          { 'tags.en': { $in: videoTags } }
        ],
        deletedAt: null,
        isPublished: true
      })
        .limit(4)
        .select('_id');

      const video = new Video({
        ...videoData,
        author: userId,
        createdBy: userId,
        publishedAt: videoData.isPublished ? new Date() : null,
        relatedServices: relatedServices.map(s => s._id),
        relatedPortfolios: relatedPortfolios.map(p => p._id),
        relatedArticles: relatedArticles.map(a => a._id)
      });

      await video.save();
      await service.populateDocument(video);

      // Invalidate cache using BaseService
      await service.invalidateCache(video);

      logger.info(`Video created: ${video.title.fa} by user ${userId}`);
      return video;
    } catch (error) {
      logger.error('Video creation error:', error);
      throw error;
    }
  }

  static async updateVideo(videoId, updateData, userId) {
    try {
      const video = await Video.findById(videoId);

      if (!video) {
        throw new Error('ویدئو یافت نشد');
      }

      // Generate and validate slug using BaseService (exclude current video)
      if (updateData.title || updateData.slug) {
        await service.generateAndValidateSlug(updateData, videoId);
      }

      // Validate categories if provided using BaseService
      if (updateData.categories) {
        await service.validateCategories(updateData.categories);
      }

      // Handle publish status change
      if (updateData.hasOwnProperty('isPublished')) {
        if (updateData.isPublished && !video.isPublished) {
          updateData.publishedAt = new Date();
        } else if (!updateData.isPublished && video.isPublished) {
          updateData.publishedAt = null;
        }
      }

      const oldSlug = {
        fa: video.slug?.fa,
        en: video.slug?.en
      };

      // If categories or tags changed, re-calculate related content
      const categoriesChanged = updateData.categories && 
        JSON.stringify(updateData.categories.sort()) !== JSON.stringify((video.categories || []).map(c => c.toString()).sort());
      const tagsChanged = updateData.tags;

      if (categoriesChanged || tagsChanged) {
        const categoryIds = updateData.categories || video.categories.map(c => c._id || c);
        const videoTags = [
          ...(updateData.tags?.fa || video.tags?.fa || []),
          ...(updateData.tags?.en || video.tags?.en || [])
        ];

        // Find related services (same categories)
        const relatedServices = await Service.find({
          categories: { $in: categoryIds },
          deletedAt: null,
          status: 'active'
        })
          .limit(4)
          .select('_id');

        // Find related portfolios (same categories)
        const relatedPortfolios = await Portfolio.find({
          categories: { $in: categoryIds },
          deletedAt: null,
          isPublished: true
        })
          .limit(4)
          .select('_id');

        // Find related articles (same categories or matching tags)
        const relatedArticles = await Article.find({
          $or: [
            { categories: { $in: categoryIds } },
            { 'tags.fa': { $in: videoTags } },
            { 'tags.en': { $in: videoTags } }
          ],
          deletedAt: null,
          isPublished: true
        })
          .limit(4)
          .select('_id');

        updateData.relatedServices = relatedServices.map(s => s._id);
        updateData.relatedPortfolios = relatedPortfolios.map(p => p._id);
        updateData.relatedArticles = relatedArticles.map(a => a._id);
      }

      Object.assign(video, updateData);
      video.updatedBy = userId;
      await video.save();
      await video.populate(['author', 'categories']);

      // Invalidate cache if slug changed or publish status changed
      const slugChanged = updateData.slug && (
        updateData.slug.fa !== oldSlug.fa || 
        updateData.slug.en !== oldSlug.en
      );
      
      if (slugChanged || updateData.hasOwnProperty('isPublished')) {
        await cacheService.deletePattern('videos:*');
        await cacheService.delete(`video:${video._id}`);
        if (oldSlug.fa) await cacheService.delete(`videos:slug:${oldSlug.fa}`);
        if (oldSlug.en) await cacheService.delete(`videos:slug:${oldSlug.en}`);
        if (video.slug?.fa) await cacheService.delete(`videos:slug:${video.slug.fa}`);
        if (video.slug?.en) await cacheService.delete(`videos:slug:${video.slug.en}`);
      }

      logger.info(`Video updated: ${video.title.fa} by user ${userId}`);
      return video;
    } catch (error) {
      logger.error('Video update error:', error);
      throw error;
    }
  }

  static async deleteVideo(videoId, userId) {
    try {
      const video = await Video.findById(videoId);

      if (!video) {
        throw new Error('ویدئو یافت نشد');
      }

      await video.softDelete(userId);

      // Invalidate cache - slug is now free for reuse
      await cacheService.deletePattern('videos:*');
      await cacheService.delete(`video:${video._id}`);
      if (video.slug?.fa) await cacheService.delete(`videos:slug:${video.slug.fa}`);
      if (video.slug?.en) await cacheService.delete(`videos:slug:${video.slug.en}`);

      logger.info(`Video deleted: ${videoId} by user ${userId}`);
      return video;
    } catch (error) {
      logger.error('Video deletion error:', error);
      throw error;
    }
  }

  static async getVideos(filters = {}) {
    try {
      const {
        page = 1,
        limit = 12,
        search = '',
        category = '',
        isPublished = true,
        isFeatured = null,
        sortBy = 'publishedAt',
        sortOrder = 'desc',
        language = 'fa'
      } = filters;

      const parsedPage = parseInt(page, 10);
      const parsedLimit = Math.min(parseInt(limit, 10), 50); // Max 50 per page

      const query = {
        deletedAt: null
      };

      // Search in title and description
      if (search) {
        query.$or = [
          { [`title.${language}`]: { $regex: search, $options: 'i' } },
          { [`description.${language}`]: { $regex: search, $options: 'i' } }
        ];
      }

      // Filter by category
      if (category) {
        query.categories = category;
      }

      // Filter by published status
      if (isPublished !== undefined && isPublished !== null && isPublished !== '') {
        const publishedValue = typeof isPublished === 'string' 
          ? isPublished === 'true' || isPublished === '1'
          : Boolean(isPublished);
        query.isPublished = publishedValue;
      }

      // Filter by featured status
      if (typeof isFeatured === 'boolean') {
        query.isFeatured = isFeatured;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parsedPage - 1) * parsedLimit;

      const [videos, total] = await Promise.all([
        Video.find(query)
          .populate('author', 'name email avatar')
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit),
        Video.countDocuments(query)
      ]);

      return {
        data: videos,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: parsedPage < Math.ceil(total / parsedLimit),
          hasPrev: parsedPage > 1
        }
      };
    } catch (error) {
      logger.error('Get videos error:', error);
      throw error;
    }
  }

  static async getVideoBySlug(slug, language = 'fa') {
    try {
      const video = await Video.findOne({
        [`slug.${language}`]: slug,
        isPublished: true,
        deletedAt: null
      })
        .populate('author', 'name email avatar')
        .populate('categories', 'name slug')
        .populate('relatedServices', 'name slug featuredImage')
        .populate('relatedPortfolios', 'title slug featuredImage')
        .populate('relatedArticles', 'title slug featuredImage');

      if (!video) {
        throw new Error('ویدئو یافت نشد');
      }

      return video;
    } catch (error) {
      logger.error('Get video by slug error:', error);
      throw error;
    }
  }

  // Generate user identifier (same as ArticleService)
  static generateUserIdentifier(req) {
    const browserFingerprint = req.headers['x-browser-fingerprint'] || req.body?.browserFingerprint || '';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    
    if (browserFingerprint && browserFingerprint.length > 10) {
      const identifierString = `${browserFingerprint}-${userAgent}`;
      return crypto.createHash('sha256').update(identifierString).digest('hex');
    }
    
    const identifierString = `${ip}-${userAgent}`;
    return crypto.createHash('sha256').update(identifierString).digest('hex');
  }

  // Track unique view for a video
  static async trackView(videoId, userIdentifier, userId = null, ip = null, userAgent = null, watchTime = 0, completionPercentage = 0) {
    try {
      const video = await Video.findById(videoId);
      if (!video || video.deletedAt) {
        throw new Error('ویدئو یافت نشد');
      }

      // Check if view already exists
      const existingView = await VideoView.findOne({ 
        video: videoId, 
        userIdentifier 
      });

      if (!existingView) {
        // Create new view record
        const viewDoc = new VideoView({
          video: videoId,
          userIdentifier,
          user: userId || null,
          ip: ip || null,
          userAgent: userAgent || null,
          watchTime: watchTime || 0,
          completionPercentage: completionPercentage || 0
        });
        await viewDoc.save();

        // Get actual count from VideoView collection
        const actualViewsCount = await VideoView.countDocuments({ video: videoId });
        
        // Update video view count
        video.views = actualViewsCount;
        await video.save();

        return {
          isNewView: true,
          views: actualViewsCount
        };
      } else {
        // Update watch time and completion if provided
        if (watchTime > existingView.watchTime) {
          existingView.watchTime = watchTime;
        }
        if (completionPercentage > existingView.completionPercentage) {
          existingView.completionPercentage = completionPercentage;
        }
        await existingView.save();
      }

      // Get actual count for accuracy
      const actualViewsCount = await VideoView.countDocuments({ video: videoId });
      
      // Sync video.views with actual count
      if (video.views !== actualViewsCount) {
        video.views = actualViewsCount;
        await video.save();
      }

      return {
        isNewView: false,
        views: actualViewsCount
      };
    } catch (error) {
      if (error.code === 11000) {
        const video = await Video.findById(videoId);
        return {
          isNewView: false,
          views: video?.views || 0
        };
      }
      logger.error('Track view error:', error);
      throw error;
    }
  }

  // Toggle like for a video
  static async toggleLike(videoId, userIdentifier, userId = null) {
    try {
      const video = await Video.findById(videoId);
      if (!video || video.deletedAt) {
        throw new Error('ویدئو یافت نشد');
      }

      // Check if like already exists
      const existingLike = await VideoLike.findOne({
        video: videoId,
        userIdentifier
      });

      if (existingLike) {
        // Unlike: remove the like
        await VideoLike.deleteOne({ _id: existingLike._id });
        
        // Get actual count
        const actualLikesCount = await VideoLike.countDocuments({ video: videoId });
        video.likes = actualLikesCount;
        await video.save();

        return {
          liked: false,
          likes: actualLikesCount
        };
      } else {
        // Like: create new like
        const likeDoc = new VideoLike({
          video: videoId,
          userIdentifier,
          user: userId || null
        });
        await likeDoc.save();

        // Get actual count
        const actualLikesCount = await VideoLike.countDocuments({ video: videoId });
        video.likes = actualLikesCount;
        await video.save();

        return {
          liked: true,
          likes: actualLikesCount
        };
      }
    } catch (error) {
      if (error.code === 11000) {
        // Race condition - get current state
        const video = await Video.findById(videoId);
        const existingLike = await VideoLike.findOne({
          video: videoId,
          userIdentifier
        });
        const actualLikesCount = await VideoLike.countDocuments({ video: videoId });
        return {
          liked: !!existingLike,
          likes: actualLikesCount
        };
      }
      logger.error('Toggle like error:', error);
      throw error;
    }
  }

  // Check if user has liked a video
  static async hasLiked(videoId, userIdentifier) {
    try {
      const like = await VideoLike.findOne({
        video: videoId,
        userIdentifier
      });
      return !!like;
    } catch (error) {
      logger.error('Check like error:', error);
      return false;
    }
  }

  // Toggle bookmark for a video (requires login)
  static async toggleBookmark(videoId, userId, note = null) {
    try {
      if (!userId) {
        throw new Error('برای بوکمارک کردن باید وارد حساب کاربری خود شوید');
      }

      const video = await Video.findById(videoId);
      if (!video || video.deletedAt) {
        throw new Error('ویدئو یافت نشد');
      }

      // Check if bookmark already exists
      const existingBookmark = await VideoBookmark.findOne({
        video: videoId,
        user: userId
      });

      if (existingBookmark) {
        // Remove bookmark
        await VideoBookmark.deleteOne({ _id: existingBookmark._id });
        
        // Get actual count
        const actualBookmarksCount = await VideoBookmark.countDocuments({ video: videoId });
        video.bookmarks = actualBookmarksCount;
        await video.save();

        return {
          bookmarked: false,
          bookmarks: actualBookmarksCount
        };
      } else {
        // Add bookmark
        const bookmarkDoc = new VideoBookmark({
          video: videoId,
          user: userId,
          note: note || null
        });
        await bookmarkDoc.save();

        // Get actual count
        const actualBookmarksCount = await VideoBookmark.countDocuments({ video: videoId });
        video.bookmarks = actualBookmarksCount;
        await video.save();

        return {
          bookmarked: true,
          bookmarks: actualBookmarksCount
        };
      }
    } catch (error) {
      if (error.code === 11000) {
        const video = await Video.findById(videoId);
        const existingBookmark = await VideoBookmark.findOne({
          video: videoId,
          user: userId
        });
        const actualBookmarksCount = await VideoBookmark.countDocuments({ video: videoId });
        return {
          bookmarked: !!existingBookmark,
          bookmarks: actualBookmarksCount
        };
      }
      logger.error('Toggle bookmark error:', error);
      throw error;
    }
  }

  // Check if user has bookmarked a video
  static async hasBookmarked(videoId, userId) {
    try {
      if (!userId) {
        return false;
      }
      const bookmark = await VideoBookmark.findOne({
        video: videoId,
        user: userId
      });
      return !!bookmark;
    } catch (error) {
      logger.error('Check bookmark error:', error);
      return false;
    }
  }

  // Get video statistics
  static async getVideoStats(videoId) {
    try {
      const [views, likes, bookmarks, comments] = await Promise.all([
        VideoView.countDocuments({ video: videoId }),
        VideoLike.countDocuments({ video: videoId }),
        VideoBookmark.countDocuments({ video: videoId }),
        Comment.countDocuments({ 
          resourceType: 'Video', 
          resourceId: videoId,
          moderationStatus: 'approved'
        })
      ]);

      return {
        views,
        likes,
        bookmarks,
        comments
      };
    } catch (error) {
      logger.error('Get video stats error:', error);
      throw error;
    }
  }

  // Get related content (articles, videos, portfolios, services)
  static async getRelatedContent(videoId, limit = 4) {
    try {
      const video = await Video.findById(videoId).populate('categories');
      if (!video) {
        return {
          articles: [],
          videos: [],
          portfolios: [],
          services: []
        };
      }

      const categoryIds = video.categories.map(cat => cat._id);

      // Get related videos (same categories)
      const relatedVideos = await Video.find({
        _id: { $ne: videoId },
        isPublished: true,
        deletedAt: null,
        categories: { $in: categoryIds }
      })
        .limit(limit)
        .populate('author', 'name')
        .select('title slug thumbnailUrl duration views likes publishedAt');

      // Get related articles (same categories)
      const relatedArticles = await Article.find({
        isPublished: true,
        deletedAt: null,
        categories: { $in: categoryIds }
      })
        .limit(limit)
        .populate('author', 'name')
        .select('title slug featuredImage readTime views likes publishedAt');

      // Get related portfolios (same categories or related services)
      const relatedPortfolios = await Portfolio.find({
        isPublished: true,
        deletedAt: null,
        $or: [
          { categories: { $in: categoryIds } },
          { services: { $in: video.relatedServices || [] } }
        ]
      })
        .limit(limit)
        .select('title slug featuredImage views');

      // Get related services
      const relatedServices = await Service.find({
        _id: { $in: video.relatedServices || [] },
        isActive: true,
        deletedAt: null
      })
        .limit(limit)
        .select('name slug featuredImage');

      return {
        articles: relatedArticles,
        videos: relatedVideos,
        portfolios: relatedPortfolios,
        services: relatedServices
      };
    } catch (error) {
      logger.error('Get related content error:', error);
      return {
        articles: [],
        videos: [],
        portfolios: [],
        services: []
      };
    }
  }
}

