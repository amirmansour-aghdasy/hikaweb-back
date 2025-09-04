import { User } from '../auth/model.js';
import { Role } from './roleModel.js';
import { logger } from '../../utils/logger.js';

export class UserService {
  static async createUser(userData, createdBy) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, ...(userData.mobile ? [{ mobile: userData.mobile }] : [])],
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

      // Check email/mobile uniqueness if changed
      if (updateData.email || updateData.mobile) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          $or: [
            ...(updateData.email ? [{ email: updateData.email }] : []),
            ...(updateData.mobile ? [{ mobile: updateData.mobile }] : [])
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

      // Prevent deletion of system admin
      const role = await Role.findById(user.role);
      if (role && role.name === 'super_admin') {
        throw new Error('حذف مدیر کل امکان‌پذیر نیست');
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
        limit = 10,
        search = '',
        role = '',
        status = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      let query = { deletedAt: null };

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { mobile: new RegExp(search, 'i') }
        ];
      }

      if (role) query.role = role;
      if (status) query.status = status;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .populate('role', 'name displayName')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }
}
