import { Database } from '../src/config/database.js';
import { Role } from '../src/modules/users/roleModel.js';
import { User } from '../src/modules/auth/model.js';
import { Category } from '../src/modules/categories/model.js';
import { Settings } from '../src/modules/settings/model.js';
import { logger } from '../src/utils/logger.js';

async function seedDatabase() {
  try {
    await Database.connect();
    logger.info('🌱 شروع seed کردن دیتابیس...');

    // Create default roles
    const roles = [
      {
        name: 'super_admin',
        displayName: { fa: 'مدیر کل', en: 'Super Admin' },
        description: { fa: 'دسترسی کامل به تمام بخش‌های سیستم', en: 'Full system access' },
        permissions: ['admin.all'],
        isSystem: true,
        priority: 100
      },
      {
        name: 'admin',
        displayName: { fa: 'مدیر', en: 'Admin' },
        description: { fa: 'دسترسی مدیریتی', en: 'Administrative access' },
        permissions: [
          'users.read',
          'users.update',
          'articles.create',
          'articles.read',
          'articles.update',
          'articles.delete',
          'services.create',
          'services.read',
          'services.update',
          'services.delete',
          'portfolio.create',
          'portfolio.read',
          'portfolio.update',
          'portfolio.delete',
          'team.create',
          'team.read',
          'team.update',
          'team.delete',
          'comments.read',
          'comments.moderate',
          'tickets.read',
          'tickets.update',
          'tickets.assign',
          'consultations.read',
          'consultations.update',
          'media.create',
          'media.read',
          'media.update',
          'media.delete',
          'categories.create',
          'categories.read',
          'categories.update',
          'categories.delete'
        ],
        isSystem: true,
        priority: 80
      },
      {
        name: 'editor',
        displayName: { fa: 'ویراستار', en: 'Editor' },
        description: { fa: 'مدیریت محتوا', en: 'Content management' },
        permissions: [
          'articles.create',
          'articles.read',
          'articles.update',
          'services.read',
          'services.update',
          'portfolio.read',
          'portfolio.update',
          'media.create',
          'media.read',
          'media.update'
        ],
        isSystem: true,
        priority: 60
      },
      {
        name: 'user',
        displayName: { fa: 'کاربر', en: 'User' },
        description: { fa: 'کاربر عادی', en: 'Regular user' },
        permissions: ['comments.create', 'tickets.create'],
        isSystem: true,
        priority: 10
      }
    ];

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        logger.info(`✅ نقش ${roleData.displayName.fa} ایجاد شد`);
      }
    }

    // Create super admin user
    const superAdminRole = await Role.findOne({ name: 'super_admin' });
    const existingSuperAdmin = await User.findOne({ email: 'admin@hikaweb.ir' });

    if (!existingSuperAdmin && superAdminRole) {
      await User.create({
        name: 'مهدی صاحب علم',
        email: 'mahdisahebelm@gmail.com',
        password: '09191393479',
        role: superAdminRole._id,
        isEmailVerified: true,
        language: 'fa',
        phoneNumber: '09120997935',
        isPhoneNumberVerified: true
      });
      logger.info('✅ کاربر مدیر کل ایجاد شد');
    }

    // Create default categories for each type
    const categoryTypes = [
      { type: 'article', name: { fa: 'عمومی', en: 'General' } },
      { type: 'service', name: { fa: 'خدمات اصلی', en: 'Main Services' } },
      { type: 'portfolio', name: { fa: 'نمونه کارها', en: 'Portfolio' } },
      { type: 'faq', name: { fa: 'سوالات متداول', en: 'General FAQ' } }
    ];

    for (const categoryType of categoryTypes) {
      const existingCategory = await Category.findOne({
        type: categoryType.type,
        'name.fa': categoryType.name.fa
      });

      if (!existingCategory) {
        await Category.create({
          name: categoryType.name,
          slug: {
            fa: 'general',
            en: 'general'
          },
          description: {
            fa: `دسته‌بندی پیش‌فرض برای ${categoryType.name.fa}`,
            en: `Default category for ${categoryType.name.en}`
          },
          type: categoryType.type,
          level: 0,
          orderIndex: 0
        });
        logger.info(`✅ دسته‌بندی ${categoryType.name.fa} ایجاد شد`);
      }
    }

    // Initialize settings
    await Settings.getInstance();
    logger.info('✅ تنظیمات پیش‌فرض ایجاد شد');

    logger.info('\n🎉 Seed کردن دیتابیس با موفقیت انجام شد!');
    logger.info('\n📋 اطلاعات ورود:');
    logger.info('ایمیل: admin@hikaweb.ir');
    logger.info('رمز عبور: HikawebAdmin@123');
    logger.info('\n🌐 لینک‌های مفید:');
    logger.info(`- سرور: http://localhost:${process.env.PORT || 3000}`);
    logger.info(`- مستندات API: http://localhost:${process.env.PORT || 3000}/api-docs`);

    await Database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ خطا در seed کردن دیتابیس:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}
