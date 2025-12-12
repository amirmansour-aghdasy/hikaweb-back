import mongoose from 'mongoose';
import { User } from '../auth/model.js';
import { Role } from './roleModel.js';
import { logger } from '../../utils/logger.js';

export class UserService {
  static async createUser(userData, createdBy) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, ...(userData.phoneNumber ? [{ phoneNumber: userData.phoneNumber }] : [])],
        deletedAt: null
      });

      if (existingUser) {
        throw new Error('کاربری با این ایمیل یا موبایل قبلاً ثبت شده است');
      }

      // Validate role exists
      if (userData.role) {
        const role = await Role.findById(userData.role);
        if (!role) {
          throw new Error('نقش انتخابی نامعتبر است');
        }
        
        // Prevent creating more than one super_admin
        if (role.name === 'super_admin') {
          const existingSuperAdmin = await User.findOne({
            role: role._id,
            deletedAt: null
          }).populate('role');
          
          if (existingSuperAdmin) {
            throw new Error('فقط یک کاربر می‌تواند نقش مدیر کل داشته باشد');
          }
        }
      }

      const user = new User({
        ...userData,
        createdBy
      });

      await user.save();
      await user.populate('role');

      logger.info(`User created: ${user.email} by ${createdBy}`);
      return user;
    } catch (error) {
      logger.error('User creation error:', error);
      throw error;
    }
  }

  static async updateUser(userId, updateData, updatedBy) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Check email/phoneNumber uniqueness if changed
      if (updateData.email || updateData.phoneNumber) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          $or: [
            ...(updateData.email ? [{ email: updateData.email }] : []),
            ...(updateData.phoneNumber ? [{ phoneNumber: updateData.phoneNumber }] : [])
          ],
          deletedAt: null
        });

        if (existingUser) {
          throw new Error('کاربری با این ایمیل یا موبایل قبلاً ثبت شده است');
        }
      }

      // Validate role if changed
      if (updateData.role) {
        const role = await Role.findById(updateData.role);
        if (!role) {
          throw new Error('نقش انتخابی نامعتبر است');
        }
        
        // Prevent assigning super_admin role if another user already has it
        if (role.name === 'super_admin') {
          const existingSuperAdmin = await User.findOne({
            _id: { $ne: userId },
            role: role._id,
            deletedAt: null
          }).populate('role');
          
          if (existingSuperAdmin) {
            throw new Error('فقط یک کاربر می‌تواند نقش مدیر کل داشته باشد');
          }
        }
      }

      Object.assign(user, updateData);
      user.updatedBy = updatedBy;

      await user.save();
      await user.populate('role');

      logger.info(`User updated: ${user.email} by ${updatedBy}`);
      return user;
    } catch (error) {
      logger.error('User update error:', error);
      throw error;
    }
  }

  static async deleteUser(userId, deletedBy) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Allow deletion of super_admin if there are multiple
      // But prevent deletion if it's the only super_admin
      const role = await Role.findById(user.role);
      if (role && role.name === 'super_admin') {
        const superAdminCount = await User.countDocuments({
          role: role._id,
          deletedAt: null
        });
        
        if (superAdminCount <= 1) {
          throw new Error('حداقل یک کاربر با نقش مدیر کل باید وجود داشته باشد');
        }
      }

      await user.softDelete();
      user.updatedBy = deletedBy;
      await user.save();

      logger.info(`User deleted: ${user.email} by ${deletedBy}`);
      return true;
    } catch (error) {
      logger.error('User deletion error:', error);
      throw error;
    }
  }

  static async getUsers(filters = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        role = '',
        status = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;

      let query = { deletedAt: null };

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phoneNumber: new RegExp(search, 'i') }
        ];
      }

      if (role) {
        // Support multiple roles separated by comma (e.g., "admin,support")
        // Role can be either role name or ObjectId
        const roleNames = role.split(',').map(r => r.trim()).filter(r => r);
        if (roleNames.length > 0) {
          // Check if values are ObjectIds or role names
          const isObjectId = (str) => mongoose.Types.ObjectId.isValid(str) && str.length === 24;
          
          const roleObjectIds = [];
          const roleNameList = [];
          
          for (const roleValue of roleNames) {
            if (isObjectId(roleValue)) {
              roleObjectIds.push(roleValue);
            } else {
              roleNameList.push(roleValue);
            }
          }
          
          // Find Role documents by name and get their ObjectIds
          if (roleNameList.length > 0) {
            const rolesByName = await Role.find({
              name: { $in: roleNameList },
              deletedAt: null
            }).select('_id');
            
            roleObjectIds.push(...rolesByName.map(r => r._id));
          }
          
          if (roleObjectIds.length > 0) {
            query.role = roleObjectIds.length === 1 ? roleObjectIds[0] : { $in: roleObjectIds };
          }
        }
      }
      if (status) query.status = status;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parsedPage - 1) * parsedLimit;

      const [users, total] = await Promise.all([
        User.find(query)
          .populate('role', 'name displayName')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit),
        User.countDocuments(query)
      ]);

      return {
        data: users,
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
      logger.error('Get users error:', error);
      throw error;
    }
  }
}
