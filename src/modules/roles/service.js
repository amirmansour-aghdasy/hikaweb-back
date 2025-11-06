import { Role } from '../users/roleModel.js';
import { User } from '../auth/model.js';
import { AppError } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';

export class RoleService {
  static async createRole(data, userId) {
    try {
      // Check if role name already exists
      const existingRole = await Role.findOne({
        name: data.name,
        deletedAt: null
      });

      if (existingRole) {
        throw new AppError('نقش با این نام قبلاً ایجاد شده است', 409);
      }

      const role = new Role(data);
      await role.save();

      logger.info('Role created:', { id: role._id, name: role.name });
      return role;
    } catch (error) {
      logger.error('Error creating role:', error);
      throw error;
    }
  }

  static async getRoles(options = {}) {
    try {
      const { search, status, page = 1, limit = 25 } = options;
      
      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;
      
      const query = { deletedAt: null };
      
      if (search) {
        query.$or = [
          { 'displayName.fa': { $regex: search, $options: 'i' } },
          { 'displayName.en': { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        query.status = status;
      }

      const skip = (parsedPage - 1) * parsedLimit;

      const [roles, total] = await Promise.all([
        Role.find(query)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        Role.countDocuments(query)
      ]);

      return {
        data: roles,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit)
        }
      };
    } catch (error) {
      logger.error('Error getting roles:', error);
      throw error;
    }
  }

  static async getRoleById(roleId) {
    try {
      const role = await Role.findOne({
        _id: roleId,
        deletedAt: null
      });

      if (!role) {
        throw new AppError('نقش یافت نشد', 404);
      }

      return role;
    } catch (error) {
      logger.error('Error getting role by id:', error);
      throw error;
    }
  }

  static async updateRole(roleId, data, userId) {
    try {
      const role = await Role.findOne({
        _id: roleId,
        deletedAt: null
      });

      if (!role) {
        throw new AppError('نقش یافت نشد', 404);
      }

      // Prevent updating system roles
      if (role.isSystem && data.isSystem === false) {
        throw new AppError('نمی‌توان نقش سیستم را ویرایش کرد', 403);
      }

      // Check if name is being changed and if it conflicts
      if (data.name && data.name !== role.name) {
        const existingRole = await Role.findOne({
          name: data.name,
          deletedAt: null,
          _id: { $ne: roleId }
        });

        if (existingRole) {
          throw new AppError('نقش با این نام قبلاً وجود دارد', 409);
        }
      }

      Object.assign(role, data);
      await role.save();

      logger.info('Role updated:', { id: role._id, name: role.name });
      return role;
    } catch (error) {
      logger.error('Error updating role:', error);
      throw error;
    }
  }

  static async deleteRole(roleId, userId) {
    try {
      const role = await Role.findOne({
        _id: roleId,
        deletedAt: null
      });

      if (!role) {
        throw new AppError('نقش یافت نشد', 404);
      }

      // Prevent deleting system roles
      if (role.isSystem) {
        throw new AppError('نمی‌توان نقش سیستم را حذف کرد', 403);
      }

      // Check if any users have this role
      const usersWithRole = await User.countDocuments({
        role: roleId,
        deletedAt: null
      });

      if (usersWithRole > 0) {
        throw new AppError(`نمی‌توان این نقش را حذف کرد زیرا ${usersWithRole} کاربر از آن استفاده می‌کنند`, 409);
      }

      role.deletedAt = new Date();
      await role.save();

      logger.info('Role deleted:', { id: role._id, name: role.name });
      return role;
    } catch (error) {
      logger.error('Error deleting role:', error);
      throw error;
    }
  }
}

