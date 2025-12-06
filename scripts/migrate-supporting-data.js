import { Database } from '../src/config/database.js';
import { Category } from '../src/modules/categories/model.js';
import { Portfolio } from '../src/modules/portfolio/model.js';
import { Brand } from '../src/modules/brands/model.js';
import { TeamMember } from '../src/modules/team/model.js';
import { Service } from '../src/modules/services/model.js';
import { User } from '../src/modules/auth/model.js';
import { logger } from '../src/utils/logger.js';

// Portfolio data from services mock
const PORTFOLIO_DATA = {
  'web-design': [
    { title: 'وسایت گواهیتو', image: '/assets/portfolio/web-design/web-design-1.webp' },
    { title: 'وسایت آسوابزار', image: '/assets/portfolio/web-design/web-design-2.webp' },
    { title: 'وسایت کیان صنعت', image: '/assets/portfolio/web-design/web-design-3.webp' },
    { title: 'وسایت کلینیک ونوس', image: '/assets/portfolio/web-design/web-design-4.webp' },
    { title: 'وسایت باستان پلیمر', image: '/assets/portfolio/web-design/web-design-5.webp' }
  ],
  'hika-studio': [
    { title: 'عکاسی استودیو 1', image: '/assets/portfolio/hika-studio/hika-studio-1.webp' },
    { title: 'عکاسی استودیو 2', image: '/assets/portfolio/hika-studio/hika-studio-2.webp' },
    { title: 'عکاسی استودیو 3', image: '/assets/portfolio/hika-studio/hika-studio-3.webp' },
    { title: 'عکاسی استودیو 4', image: '/assets/portfolio/hika-studio/hika-studio-4.webp' },
    { title: 'عکاسی استودیو 5', image: '/assets/portfolio/hika-studio/hika-studio-5.webp' },
    { title: 'عکاسی استودیو 6', image: '/assets/portfolio/hika-studio/hika-studio-6.webp' },
    { title: 'عکاسی استودیو 7', image: '/assets/portfolio/hika-studio/hika-studio-7.webp' },
    { title: 'عکاسی استودیو 8', image: '/assets/portfolio/hika-studio/hika-studio-8.webp' }
  ]
};

// Brands data
const BRANDS_DATA = [
  '/assets/brands/brand-1.png',
  '/assets/brands/brand-2.png',
  '/assets/brands/brand-3.png',
  '/assets/brands/brand-4.png',
  '/assets/brands/brand-5.png',
  '/assets/brands/brand-6.png',
  '/assets/brands/brand-7.png',
  '/assets/brands/brand-8.png',
  '/assets/brands/brand-9.png',
  '/assets/brands/brand-10.png',
  '/assets/brands/brand-11.png',
  '/assets/brands/brand-12.png'
];

// Helper function to generate Persian slug (keeps Persian characters)
function generateSlugFa(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\s\u200C\u200D]+/g, '-') // Replace spaces and zero-width characters with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

// Helper function to generate English slug from English text only
// Only allows a-z, 0-9, and - characters
function generateSlugEn(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Only keep a-z, 0-9, spaces, and dashes
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .trim();
}

async function migrateSupportingData() {
  try {
    await Database.connect();
    logger.info('🌱 شروع migration داده‌های پشتیبان...');

    // Get super admin user
    const superAdmin = await User.findOne({ email: 'mahdisahebelm@gmail.com' });
    if (!superAdmin) {
      throw new Error('کاربر super admin پیدا نشد. لطفاً ابتدا seed.js را اجرا کنید.');
    }

    // Get or create categories
    let portfolioCategory = await Category.findOne({ type: 'portfolio', level: 0 });
    if (!portfolioCategory) {
      portfolioCategory = await Category.create({
        name: { fa: 'نمونه کارها', en: 'Portfolio' },
        slug: { fa: 'portfolio', en: 'portfolio' },
        description: { fa: 'دسته‌بندی اصلی نمونه کارها', en: 'Main portfolio category' },
        type: 'portfolio',
        level: 0,
        orderIndex: 0
      });
      logger.info('✅ دسته‌بندی نمونه کارها ایجاد شد');
    }

    // Get services
    const services = await Service.find({});
    if (services.length === 0) {
      logger.warn('⚠️  هیچ خدمتی در دیتابیس وجود ندارد. لطفاً ابتدا migrate-services.js را اجرا کنید.');
    }

    // Migrate Portfolio items
    let portfolioCount = 0;
    for (const [serviceSlug, portfolioItems] of Object.entries(PORTFOLIO_DATA)) {
      const service = services.find(s => s.slug.fa === serviceSlug || s.slug.en === serviceSlug);
      
      if (!service) {
        logger.warn(`⚠️  خدمت ${serviceSlug} پیدا نشد. نمونه کارها برای این خدمت ایجاد نمی‌شود.`);
        continue;
      }

      for (let i = 0; i < portfolioItems.length; i++) {
        const item = portfolioItems[i];
        const slugFa = generateSlugFa(item.title);
        // Generate English slug from service name + index since we don't have English title
        const slugEn = generateSlugEn(`${service.name.en}-portfolio-${i + 1}`);

        // Check if portfolio item already exists
        const existingPortfolio = await Portfolio.findOne({ 'slug.fa': slugFa });
        if (existingPortfolio) {
          continue;
        }

        const portfolioData = {
          title: {
            fa: item.title,
            en: item.title // Will be updated manually later if needed
          },
          slug: {
            fa: slugFa,
            en: slugEn
          },
          description: {
            fa: `نمونه کار ${item.title} در زمینه ${service.name.fa}`,
            en: `Portfolio item ${item.title} in ${service.name.en}`
          },
          shortDescription: {
            fa: `نمونه کار حرفه‌ای ${item.title}`,
            en: `Professional portfolio item ${item.title}`
          },
          client: {
            name: item.title,
            industry: { fa: 'عمومی', en: 'General' }
          },
          project: {
            duration: 30,
            completedAt: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)),
            projectType: { fa: service.name.fa, en: service.name.en }
          },
          services: [service._id],
          categories: [portfolioCategory._id],
          featuredImage: item.image,
          gallery: [{
            url: item.image,
            type: 'image',
            alt: { fa: item.title, en: item.title },
            order: 0
          }],
          orderIndex: i,
          isFeatured: i < 3,
          seo: {
            metaTitle: {
              fa: `${item.title} | نمونه کار هیکاوب`,
              en: `${item.title} | Hikaweb Portfolio`
            },
            metaDescription: {
              fa: `نمونه کار حرفه‌ای ${item.title} در زمینه ${service.name.fa} توسط تیم هیکاوب`,
              en: `Professional portfolio item ${item.title} in ${service.name.en} by Hikaweb team`
            },
            metaKeywords: {
              fa: [item.title, 'نمونه کار', 'هیکاوب', service.name.fa],
              en: [item.title, 'Portfolio', 'Hikaweb', service.name.en]
            }
          }
        };

        const portfolio = await Portfolio.create(portfolioData);
        logger.info(`✅ نمونه کار "${item.title}" ایجاد شد`);
        portfolioCount++;

        // Link portfolio to service
        service.relatedCaseStudies.push(portfolio._id);
        await service.save();
      }
    }

    logger.info(`📊 ${portfolioCount} نمونه کار ایجاد شد`);

    // Migrate Brands
    let brandCount = 0;
    for (let i = 0; i < BRANDS_DATA.length; i++) {
      const brandImage = BRANDS_DATA[i];
      const brandName = `برند ${i + 1}`;

      // Check if brand already exists
      const existingBrand = await Brand.findOne({ name: brandName });
      if (existingBrand) {
        continue;
      }

      const brandData = {
        name: brandName,
        logo: brandImage,
        website: '',
        description: {
          fa: `برند ${i + 1} - همکار هیکاوب`,
          en: `Brand ${i + 1} - Hikaweb Partner`
        },
        serviceField: 'other',
        orderIndex: i,
        isPartner: true,
        isFeatured: i < 6
      };

      await Brand.create(brandData);
      logger.info(`✅ برند "${brandName}" ایجاد شد`);
      brandCount++;
    }

    logger.info(`📊 ${brandCount} برند ایجاد شد`);

    // Migrate Team Members
    const TEAM_MEMBERS_DATA = [
      {
        name: { fa: 'مهدی صاحب علم', en: 'Mahdi Sahebelm' },
        position: { fa: 'گرافیست', en: 'Graphic Designer' },
        department: 'design',
        avatar: '/assets/images/team-member.png'
      },
      {
        name: { fa: 'امیرمنصور اقدسی', en: 'Amirmansour Aghdasi' },
        position: { fa: 'توسعه‌دهنده فول استک', en: 'Full-stack Developer' },
        department: 'development',
        avatar: '/assets/images/team-member.png'
      },
      {
        name: { fa: 'امیرحسین مکینه', en: 'Amirhossein Makineh' },
        position: { fa: 'توسعه‌دهنده بک‌اند', en: 'Back-end Developer' },
        department: 'development',
        avatar: '/assets/images/team-member.png'
      },
      {
        name: { fa: 'علیرضا بابائی', en: 'Alireza Babaei' },
        position: { fa: 'توسعه‌دهنده فرانت‌اند', en: 'Front-end Developer' },
        department: 'development',
        avatar: '/assets/images/team-member.png'
      }
    ];

    let teamCount = 0;
    for (let i = 0; i < TEAM_MEMBERS_DATA.length; i++) {
      const memberData = TEAM_MEMBERS_DATA[i];

      // Check if team member already exists
      const existingMember = await TeamMember.findOne({ 'name.fa': memberData.name.fa });
      if (existingMember) {
        continue;
      }

      const teamMemberData = {
        name: memberData.name,
        position: memberData.position,
        avatar: memberData.avatar,
        department: memberData.department,
        bio: {
          fa: `عضو تیم هیکاوب در بخش ${memberData.position.fa}`,
          en: `Hikaweb team member in ${memberData.position.en} department`
        },
        orderIndex: i,
        isPublic: true,
        joinDate: new Date(Date.now() - (i * 90 * 24 * 60 * 60 * 1000)) // Different join dates
      };

      await TeamMember.create(teamMemberData);
      logger.info(`✅ عضو تیم "${memberData.name.fa}" ایجاد شد`);
      teamCount++;
    }

    logger.info(`📊 ${teamCount} عضو تیم ایجاد شد`);

    logger.info(`\n🎉 Migration داده‌های پشتیبان با موفقیت انجام شد!`);
    logger.info(`📊 آمار: ${portfolioCount} نمونه کار، ${brandCount} برند، ${teamCount} عضو تیم`);

    await Database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ خطا در migration داده‌های پشتیبان:', error);
    await Database.disconnect();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSupportingData();
}

