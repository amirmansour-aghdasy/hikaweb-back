import { TeamMember } from './model.js';
import { AppError } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { cacheService } from '../../services/cache.js';

export class TeamService {
  static async createTeamMember(data, userId) {
    try {
      // Check if slug exists
      const existingMember = await TeamMember.findOne({ slug: data.slug });
      if (existingMember) {
        throw new AppError('اسلاگ عضو تیم تکراری است', 400);
      }

      const teamMember = new TeamMember({
        ...data,
        createdBy: userId,
        updatedBy: userId
      });

      await teamMember.save();

      // Clear cache
      await cacheService.deletePattern('team:*');

      logger.info('Team member created:', { id: teamMember._id, name: teamMember.name });

      return teamMember;
    } catch (error) {
      logger.error('Error creating team member:', error);
      throw error;
    }
  }

  static async getTeamMembers(query = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        status = 'active',
        search,
        sortBy = 'orderIndex',
        sortOrder = 'asc',
        isPublic
      } = query;

      const cacheKey = `team:list:${JSON.stringify(query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const filter = { deletedAt: null };

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
      }

      if (search) {
        filter.$or = [
          { 'name.fa': { $regex: search, $options: 'i' } },
          { 'name.en': { $regex: search, $options: 'i' } },
          { 'position.fa': { $regex: search, $options: 'i' } },
          { 'position.en': { $regex: search, $options: 'i' } }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [teamMembers, total] = await Promise.all([
        TeamMember.find(filter).sort(sortOptions).skip(skip).limit(parseInt(limit)).select('-__v'),
        TeamMember.countDocuments(filter)
      ]);

      const result = {
        teamMembers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, 300); // 5 minutes
      return result;
    } catch (error) {
      logger.error('Error getting team members:', error);
      throw error;
    }
  }

  static async getTeamMemberBySlug(slug) {
    try {
      const cacheKey = `team:slug:${slug}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const teamMember = await TeamMember.findOne({
        slug,
        deletedAt: null,
        status: 'active',
        isPublic: true
      });

      if (!teamMember) {
        throw new AppError('عضو تیم یافت نشد', 404);
      }

      await cacheService.set(cacheKey, teamMember, 600); // 10 minutes
      return teamMember;
    } catch (error) {
      logger.error('Error getting team member by slug:', error);
      throw error;
    }
  }

  static async updateTeamMember(id, data, userId) {
    try {
      const teamMember = await TeamMember.findById(id);
      if (!teamMember || teamMember.deletedAt) {
        throw new AppError('عضو تیم یافت نشد', 404);
      }

      // Check slug uniqueness if changed
      if (data.slug && data.slug !== teamMember.slug) {
        const existingMember = await TeamMember.findOne({
          slug: data.slug,
          _id: { $ne: id }
        });
        if (existingMember) {
          throw new AppError('اسلاگ عضو تیم تکراری است', 400);
        }
      }

      Object.assign(teamMember, data, { updatedBy: userId });
      await teamMember.save();

      // Clear cache
      await cacheService.deletePattern('team:*');

      logger.info('Team member updated:', { id: teamMember._id });

      return teamMember;
    } catch (error) {
      logger.error('Error updating team member:', error);
      throw error;
    }
  }

  static async deleteTeamMember(id, userId) {
    try {
      const teamMember = await TeamMember.findById(id);
      if (!teamMember || teamMember.deletedAt) {
        throw new AppError('عضو تیم یافت نشد', 404);
      }

      teamMember.deletedAt = new Date();
      teamMember.updatedBy = userId;
      await teamMember.save();

      // Clear cache
      await cacheService.deletePattern('team:*');

      logger.info('Team member deleted:', { id });

      return true;
    } catch (error) {
      logger.error('Error deleting team member:', error);
      throw error;
    }
  }

  static async getPublicTeamMembers(limit = 20) {
    try {
      const cacheKey = `team:public:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const teamMembers = await TeamMember.find({
        status: 'active',
        isPublic: true,
        deletedAt: null
      })
        .sort({ orderIndex: 1, createdAt: 1 })
        .limit(limit)
        .select('name position avatar bio skills experience socialLinks');

      await cacheService.set(cacheKey, teamMembers, 600); // 10 minutes
      return teamMembers;
    } catch (error) {
      logger.error('Error getting public team members:', error);
      throw error;
    }
  }
}
