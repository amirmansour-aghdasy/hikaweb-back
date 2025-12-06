import { Database } from '../src/config/database.js';
import { Service } from '../src/modules/services/model.js';
import { Category } from '../src/modules/categories/model.js';
import { Portfolio } from '../src/modules/portfolio/model.js';
import { FAQ } from '../src/modules/faq/model.js';
import { User } from '../src/modules/auth/model.js';
import { logger } from '../src/utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Service slug mapping
const SERVICE_SLUG_MAP = {
  'seo-and-optimization': {
    fa: 'seo-and-optimization',
    en: 'seo-and-optimization',
    name: { fa: 'سئو و بهینه‌سازی', en: 'SEO and Optimization' },
    category: 'service'
  },
  'hika-studio': {
    fa: 'hika-studio',
    en: 'hika-studio',
    name: { fa: 'هیکا استودیو', en: 'Hika Studio' },
    category: 'service'
  },
  'graphic-design': {
    fa: 'graphic-design',
    en: 'graphic-design',
    name: { fa: 'طراحی گرافیک', en: 'Graphic Design' },
    category: 'service'
  },
  'social-marketing': {
    fa: 'social-media-management',
    en: 'social-media-management',
    name: { fa: 'مدیریت شبکه‌های اجتماعی', en: 'Social Media Management' },
    category: 'service'
  },
  'content-and-editing': {
    fa: 'content-production-and-editing',
    en: 'content-production-and-editing',
    name: { fa: 'تولید محتوا و تدوین', en: 'Content Production and Editing' },
    category: 'service'
  },
  'logo-design': {
    fa: 'logo-design',
    en: 'logo-design',
    name: { fa: 'طراحی لوگو و برندسازی', en: 'Logo Design and Branding' },
    category: 'service'
  },
  'web-design': {
    fa: 'web-design',
    en: 'web-design',
    name: { fa: 'طراحی و برنامه‌نویسی وب‌سایت', en: 'Web Design and Development' },
    category: 'service'
  },
  'printing': {
    fa: 'printing',
    en: 'printing',
    name: { fa: 'چاپ و تبلیغات محیطی', en: 'Printing and Outdoor Advertising' },
    category: 'service'
  }
};

// Helper function to generate Persian slug (keeps Persian characters)
function generateSlugFa(text) {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/[\s\u200C\u200D]+/g, '-') // Replace spaces and zero-width characters with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

// Helper function to generate English slug (only a-z, 0-9, -)
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

// Helper function to generate SEO content
function generateSEOContent(serviceData, slug) {
  const name = serviceData.name?.fa || SERVICE_SLUG_MAP[slug]?.name?.fa || '';
  const description = serviceData.description?.fa || serviceData.shortDescription?.fa || '';
  
  return {
    metaTitle: {
      fa: `${name} | آژانس دیجیتال مارکتینگ هیکاوب`,
      en: `${serviceData.name?.en || SERVICE_SLUG_MAP[slug]?.name?.en || ''} | Hikaweb Digital Marketing Agency`
    },
    metaDescription: {
      fa: description.substring(0, 160) || `خدمات حرفه‌ای ${name} توسط تیم متخصص هیکاوب. کیفیت و تخصص در هر پروژه.`,
      en: description.substring(0, 160) || `Professional ${serviceData.name?.en || ''} services by Hikaweb expert team. Quality and expertise in every project.`
    },
    metaKeywords: {
      fa: [name, 'هیکاوب', 'دیجیتال مارکتینگ', 'خدمات حرفه‌ای', slug],
      en: [serviceData.name?.en || '', 'Hikaweb', 'Digital Marketing', 'Professional Services', slug]
    }
  };
}

// Transform mock service data to Service model format
function transformServiceData(mockData, slug) {
  const serviceInfo = SERVICE_SLUG_MAP[slug] || { name: { fa: mockData.title, en: mockData.title } };
  
  // Transform pricing
  const pricing = {
    isCustom: true,
    currency: 'IRR',
    packages: (mockData.pricing || []).map((pkg, index) => ({
      name: { fa: pkg.title || '', en: pkg.title || '' },
      value: pkg.value || '',
      subTitle: { fa: pkg.subTitle || '', en: pkg.subTitle || '' },
      features: pkg.features || [],
      desc: { fa: pkg.desc || '', en: pkg.desc || '' },
      actionBtnText: { fa: 'مشاوره دریافت کنید', en: 'Get Consultation' },
      isPopular: index === 1
    }))
  };

  // Transform subServices
  const subServices = (mockData.subServices || []).map(sub => ({
    icon: sub.iconSrc || '',
    title: { fa: sub.text || '', en: sub.text || '' }
  }));

  // Transform processSteps - IMPORTANT: use step.text not step.description
  const processSteps = (mockData.process || []).map((step, index) => ({
    title: step.title || '',
    description: { fa: step.text || '', en: step.text || '' },
    icon: step.iconHref || step.icon || '',
    order: index
  }));

  // Transform mainContent - slides will be populated later with Portfolio IDs
  const mainContent = {
    firstSection: {
      content: {
        title: { fa: mockData.mainContent?.firstSection?.content?.title || '', en: '' },
        description: { fa: mockData.mainContent?.firstSection?.content?.description || '', en: '' },
        actionBtnText: { fa: mockData.mainContent?.firstSection?.content?.actionBtnText || 'مشاوره دریافت کنید', en: 'Get Consultation' }
      },
      slides: [] // Will be populated with Portfolio references
    },
    secondSection: {
      content: {
        title: { fa: mockData.mainContent?.secondSection?.content?.title || '', en: '' },
        description: { fa: mockData.mainContent?.secondSection?.content?.description || '', en: '' },
        actionBtnText: { fa: mockData.mainContent?.secondSection?.content?.actionBtnText || 'مشاوره دریافت کنید', en: 'Get Consultation' }
      },
      slides: [] // Will be populated with Portfolio references
    }
  };

  // Transform finalDesc
  const finalDesc = mockData.finalDesc ? {
    content: {
      title: { fa: mockData.finalDesc.content?.title || '', en: '' },
      text: { fa: mockData.finalDesc.content?.text || '', en: '' }
    },
    image: mockData.finalDesc.image || ''
  } : null;

  // Generate short description from main description
  const shortDescription = {
    fa: (mockData.mainContent?.firstSection?.content?.description || '').substring(0, 300),
    en: ''
  };

  return {
    name: serviceInfo.name,
    slug: {
      fa: serviceInfo.fa,
      en: serviceInfo.en
    },
    description: {
      fa: mockData.mainContent?.firstSection?.content?.description || shortDescription.fa,
      en: serviceInfo.name.en
    },
    shortDescription,
    featuredImage: mockData.mainBanner || '',
    gallery: [],
    categories: [], // Will be populated with Category references
    processSteps,
    features: [],
    subServices,
    pricing,
    mainContent,
    finalDesc,
    relatedCaseStudies: [],
    relatedArticles: [],
    technologies: [],
    deliverables: [],
    orderIndex: 0,
    isPopular: slug === 'web-design' || slug === 'seo-and-optimization',
    seo: generateSEOContent({ name: serviceInfo.name, description: shortDescription }, slug)
  };
}

// Create Portfolio item from slide data
async function createPortfolioFromSlide(slide, service, serviceName, portfolioCategory, userId, index) {
  try {
    const slideTitle = slide.title || `نمونه کار ${index + 1}`;
    let slugFa = generateSlugFa(slideTitle);
    let slugEn = generateSlugEn(slideTitle);

    // Ensure slug is not empty
    if (!slugFa || slugFa.trim() === '') {
      slugFa = `portfolio-${index + 1}`;
    }
    if (!slugEn || slugEn.trim() === '') {
      slugEn = `portfolio-${index + 1}`;
    }

    // Make slug unique by adding index if needed
    let finalSlugFa = slugFa;
    let finalSlugEn = slugEn;
    let counter = 0;
    
    while (true) {
      const existingPortfolio = await Portfolio.findOne({
        $or: [
          { 'slug.fa': finalSlugFa },
          { 'slug.en': finalSlugEn }
        ],
        deletedAt: null
      });

      if (!existingPortfolio) {
        break;
      }

      counter++;
      finalSlugFa = `${slugFa}-${counter}`;
      finalSlugEn = `${slugEn}-${counter}`;
    }

    if (counter > 0) {
      logger.info(`ℹ️  Portfolio با slug ${slugFa} از قبل وجود دارد. استفاده از ${finalSlugFa}`);
    }

    const portfolioData = {
      title: {
        fa: slideTitle,
        en: slideTitle
      },
      slug: {
        fa: finalSlugFa,
        en: finalSlugEn
      },
      description: {
        fa: `نمونه کار ${slideTitle} در زمینه ${serviceName.fa}`,
        en: `Portfolio item ${slideTitle} in ${serviceName.en}`
      },
      shortDescription: {
        fa: `نمونه کار حرفه‌ای ${slideTitle}`,
        en: `Professional portfolio item ${slideTitle}`
      },
      client: {
        name: slideTitle,
        industry: { fa: 'عمومی', en: 'General' }
      },
      project: {
        duration: 30,
        completedAt: new Date(Date.now() - (index * 30 * 24 * 60 * 60 * 1000)),
        projectType: { fa: serviceName.fa, en: serviceName.en }
      },
      services: [service._id],
      categories: [portfolioCategory._id],
      featuredImage: slide.imageSrc || '',
      gallery: [{
        url: slide.imageSrc || '',
        type: 'image',
        alt: { fa: slide.alt || slideTitle, en: slide.alt || slideTitle },
        caption: { fa: slideTitle, en: slideTitle },
        order: 0
      }],
      orderIndex: index,
      isFeatured: index < 3,
      seo: {
        metaTitle: {
          fa: `${slideTitle} | نمونه کار هیکاوب`,
          en: `${slideTitle} | Hikaweb Portfolio`
        },
        metaDescription: {
          fa: `نمونه کار حرفه‌ای ${slideTitle} در زمینه ${serviceName.fa} توسط تیم هیکاوب`,
          en: `Professional portfolio item ${slideTitle} in ${serviceName.en} by Hikaweb team`
        },
        metaKeywords: {
          fa: [slideTitle, 'نمونه کار', 'هیکاوب', serviceName.fa],
          en: [slideTitle, 'Portfolio', 'Hikaweb', serviceName.en]
        }
      },
      createdBy: userId,
      updatedBy: userId
    };

    const portfolio = await Portfolio.create(portfolioData);
    logger.info(`✅ Portfolio ${slideTitle} ایجاد شد`);
    return portfolio._id;
  } catch (error) {
    logger.error(`❌ خطا در ایجاد Portfolio برای slide ${slide.title}:`, error.message);
    return null;
  }
}

// Create FAQs for service
async function createFAQsForService(faqs, serviceId, userId) {
  const createdFAQs = [];
  
  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i];
    try {
      const faqData = {
        question: {
          fa: faq.question || '',
          en: faq.question || ''
        },
        answer: {
          fa: faq.answer || '',
          en: faq.answer || ''
        },
        service: serviceId,
        orderIndex: i,
        isPublic: true,
        status: 'active',
        createdBy: userId,
        updatedBy: userId
      };

      const createdFAQ = await FAQ.create(faqData);
      createdFAQs.push(createdFAQ._id);
      logger.info(`✅ FAQ ${i + 1} برای service ایجاد شد`);
    } catch (error) {
      logger.error(`❌ خطا در ایجاد FAQ ${i + 1}:`, error.message);
    }
  }
  
  return createdFAQs;
}

// Delete existing data for services
async function deleteExistingServices(slugs) {
  try {
    logger.info('🗑️  شروع پاک کردن داده‌های قبلی...');
    
    // Find all services with these slugs
    const services = await Service.find({
      $or: slugs.map(slug => ({
        $or: [
          { 'slug.fa': SERVICE_SLUG_MAP[slug]?.fa || slug },
          { 'slug.en': SERVICE_SLUG_MAP[slug]?.en || slug }
        ]
      }))
    });

    const serviceIds = services.map(s => s._id);

    if (serviceIds.length > 0) {
      // Delete FAQs linked to these services
      const faqResult = await FAQ.deleteMany({ service: { $in: serviceIds } });
      logger.info(`🗑️  ${faqResult.deletedCount} FAQ حذف شد`);

      // Delete Portfolio items linked to these services
      const portfolioResult = await Portfolio.deleteMany({ services: { $in: serviceIds } });
      logger.info(`🗑️  ${portfolioResult.deletedCount} Portfolio item حذف شد`);

      // Delete Services
      const serviceResult = await Service.deleteMany({ _id: { $in: serviceIds } });
      logger.info(`🗑️  ${serviceResult.deletedCount} Service حذف شد`);
    } else {
      logger.info('ℹ️  هیچ Service موجودی برای حذف پیدا نشد');
    }

    logger.info('✅ پاک کردن داده‌های قبلی با موفقیت انجام شد');
  } catch (error) {
    logger.error('❌ خطا در پاک کردن داده‌های قبلی:', error);
    throw error;
  }
}

async function migrateServices() {
  try {
    await Database.connect();
    logger.info('🌱 شروع migration کامل خدمات...');

    // Get or create service category
    let serviceCategory = await Category.findOne({ type: 'service', level: 0 });
    if (!serviceCategory) {
      serviceCategory = await Category.create({
        name: { fa: 'خدمات', en: 'Services' },
        slug: { fa: 'services', en: 'services' },
        description: { fa: 'دسته‌بندی اصلی خدمات', en: 'Main services category' },
        type: 'service',
        level: 0,
        orderIndex: 0
      });
      logger.info('✅ دسته‌بندی خدمات ایجاد شد');
    }

    // Get or create portfolio category
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

    // Get super admin user for createdBy
    const superAdmin = await User.findOne({ email: 'mahdisahebelm@gmail.com' });
    if (!superAdmin) {
      const firstUser = await User.findOne({});
      if (!firstUser) {
        throw new Error('هیچ کاربری در سیستم وجود ندارد. لطفاً ابتدا یک کاربر ایجاد کنید.');
      }
      logger.warn('⚠️  کاربر super admin پیدا نشد. از اولین کاربر استفاده می‌شود.');
    }
    const userId = superAdmin?._id || (await User.findOne({}))._id;

    // Read mock services data
    const mockServicesPath = join(__dirname, '../../front/src/__mocks__/services.js');
    let mockServicesContent;
    try {
      mockServicesContent = readFileSync(mockServicesPath, 'utf-8');
    } catch (error) {
      logger.error('❌ خطا در خواندن فایل mock services:', error);
      throw error;
    }

    // Extract services object from the file
    const servicesMatch = mockServicesContent.match(/export const services = ({[\s\S]*});/);
    if (!servicesMatch) {
      throw new Error('نمی‌توان services object را از فایل استخراج کرد');
    }

    // Evaluate the services object (safe in this context as it's our own file)
    let mockServices;
    try {
      mockServices = eval(`(${servicesMatch[1]})`);
    } catch (error) {
      logger.error('❌ خطا در parse کردن services object:', error);
      throw new Error('خطا در parse کردن فایل services.js');
    }

    // Get all slugs for deletion
    const slugs = Object.keys(mockServices);

    // Delete existing data
    await deleteExistingServices(slugs);

    let migratedCount = 0;
    let portfolioCount = 0;
    let faqCount = 0;

    // Migrate each service
    for (const [slug, mockData] of Object.entries(mockServices)) {
      try {
        logger.info(`\n📦 شروع migration خدمت: ${slug}`);

        // Transform mock data to service model
        const serviceData = transformServiceData(mockData, slug);
        serviceData.categories = [serviceCategory._id];
        serviceData.createdBy = userId;
        serviceData.updatedBy = userId;

        // Create service first
        const service = await Service.create(serviceData);
        logger.info(`✅ خدمت ${serviceData.name.fa} (${slug}) ایجاد شد`);
        migratedCount++;

        // Create Portfolio items for firstSection slides
        const firstSectionPortfolioIds = [];
        if (mockData.mainContent?.firstSection?.slides && mockData.mainContent.firstSection.slides.length > 0) {
          for (let i = 0; i < mockData.mainContent.firstSection.slides.length; i++) {
            const slide = mockData.mainContent.firstSection.slides[i];
            const portfolioId = await createPortfolioFromSlide(
              slide,
              service,
              serviceData.name,
              portfolioCategory,
              userId,
              i
            );
            if (portfolioId) {
              firstSectionPortfolioIds.push(portfolioId);
              portfolioCount++;
            }
          }
        }

        // Create Portfolio items for secondSection slides
        const secondSectionPortfolioIds = [];
        if (mockData.mainContent?.secondSection?.slides && mockData.mainContent.secondSection.slides.length > 0) {
          for (let i = 0; i < mockData.mainContent.secondSection.slides.length; i++) {
            const slide = mockData.mainContent.secondSection.slides[i];
            const portfolioId = await createPortfolioFromSlide(
              slide,
              service,
              serviceData.name,
              portfolioCategory,
              userId,
              firstSectionPortfolioIds.length + i
            );
            if (portfolioId) {
              secondSectionPortfolioIds.push(portfolioId);
              portfolioCount++;
            }
          }
        }

        // Update service with Portfolio IDs
        service.mainContent.firstSection.slides = firstSectionPortfolioIds;
        service.mainContent.secondSection.slides = secondSectionPortfolioIds;
        await service.save();
        logger.info(`✅ Portfolio items به خدمت ${serviceData.name.fa} لینک شدند`);

        // Create FAQs
        if (mockData.faqs && mockData.faqs.length > 0) {
          const createdFAQs = await createFAQsForService(mockData.faqs, service._id, userId);
          faqCount += createdFAQs.length;
          logger.info(`✅ ${createdFAQs.length} FAQ برای خدمت ${serviceData.name.fa} ایجاد شد`);
        }

        logger.info(`✅ Migration خدمت ${slug} با موفقیت انجام شد`);

      } catch (error) {
        logger.error(`❌ خطا در migration خدمت ${slug}:`, error.message);
        logger.error(error.stack);
      }
    }

    logger.info(`\n🎉 Migration کامل خدمات با موفقیت انجام شد!`);
    logger.info(`📊 آمار:`);
    logger.info(`   - ${migratedCount} خدمت ایجاد/به‌روزرسانی شد`);
    logger.info(`   - ${portfolioCount} Portfolio item ایجاد شد`);
    logger.info(`   - ${faqCount} FAQ ایجاد شد`);

    await Database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ خطا در migration کامل خدمات:', error);
    logger.error(error.stack);
    await Database.disconnect();
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateServices();
}

export { migrateServices };

