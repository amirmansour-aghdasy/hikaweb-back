import { Database } from '../src/config/database.js';
import { Service } from '../src/modules/services/model.js';
import { Category } from '../src/modules/categories/model.js';
import { Portfolio } from '../src/modules/portfolio/model.js';
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

// Helper function to generate English slug from English text only
// Only allows a-z, 0-9, and - characters
function generateSlug(text) {
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
      name: { fa: pkg.title, en: pkg.title },
      value: pkg.value || '',
      subTitle: { fa: pkg.subTitle || '', en: pkg.subTitle || '' },
      features: pkg.features || [],
      desc: { fa: pkg.desc || '', en: pkg.desc || '' },
      actionBtnText: { fa: 'مشاوره دریافت کنید', en: 'Get Consultation' },
      isPopular: index === 1 // Mark second package as popular
    }))
  };

  // Transform subServices
  const subServices = (mockData.subServices || []).map(sub => ({
    icon: sub.iconSrc || '',
    title: { fa: sub.text, en: sub.text }
  }));

  // Transform mainContent
  const mainContent = {
    firstSection: {
      content: {
        title: { fa: mockData.mainContent?.firstSection?.content?.title || '', en: '' },
        description: { fa: mockData.mainContent?.firstSection?.content?.description || '', en: '' },
        actionBtnText: { fa: mockData.mainContent?.firstSection?.content?.actionBtnText || 'مشاوره دریافت کنید', en: 'Get Consultation' }
      },
      slides: [] // Will be populated with Portfolio references later
    },
    secondSection: {
      content: {
        title: { fa: mockData.mainContent?.secondSection?.content?.title || '', en: '' },
        description: { fa: mockData.mainContent?.secondSection?.content?.description || '', en: '' },
        actionBtnText: { fa: mockData.mainContent?.secondSection?.content?.actionBtnText || 'مشاوره دریافت کنید', en: 'Get Consultation' }
      },
      slides: [] // Will be populated with Portfolio references later
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
    processSteps: (mockData.process || []).map((step, index) => ({
      title: step.title || '',
      description: { fa: step.description || '', en: '' },
      icon: step.icon || '',
      order: index
    })),
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

async function migrateServices() {
  try {
    await Database.connect();
    logger.info('🌱 شروع migration خدمات...');

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

    // Get super admin user for createdBy
    const superAdmin = await User.findOne({ email: 'mahdisahebelm@gmail.com' });
    if (!superAdmin) {
      logger.warn('⚠️  کاربر super admin پیدا نشد. از اولین کاربر استفاده می‌شود.');
    }

    // Read mock services data
    const mockServicesPath = join(__dirname, '../../front/src/__mocks__/services.js');
    let mockServicesContent;
    try {
      mockServicesContent = readFileSync(mockServicesPath, 'utf-8');
    } catch (error) {
      logger.error('❌ خطا در خواندن فایل mock services:', error);
      throw error;
    }

    // Extract services object from the file (simple regex extraction)
    const servicesMatch = mockServicesContent.match(/export const services = ({[\s\S]*});/);
    if (!servicesMatch) {
      throw new Error('نمی‌توان services object را از فایل استخراج کرد');
    }

    // Evaluate the services object (in a safe way)
    // Note: In production, you might want to use a proper parser
    const mockServices = eval(`(${servicesMatch[1]})`);

    let migratedCount = 0;
    let skippedCount = 0;

    // Migrate each service
    for (const [slug, mockData] of Object.entries(mockServices)) {
      try {
        // Check if service already exists
        const existingService = await Service.findOne({ 'slug.fa': slug });
        if (existingService) {
          logger.info(`ℹ️  خدمت ${slug} از قبل وجود دارد. نادیده گرفته می‌شود.`);
          skippedCount++;
          continue;
        }

        // Transform mock data to service model
        const serviceData = transformServiceData(mockData, slug);
        serviceData.categories = [serviceCategory._id];
        serviceData.createdBy = superAdmin?._id;

        // Create service
        const service = await Service.create(serviceData);
        logger.info(`✅ خدمت ${serviceData.name.fa} (${slug}) ایجاد شد`);
        migratedCount++;

      } catch (error) {
        logger.error(`❌ خطا در migration خدمت ${slug}:`, error.message);
      }
    }

    logger.info(`\n🎉 Migration خدمات با موفقیت انجام شد!`);
    logger.info(`📊 آمار: ${migratedCount} خدمت جدید، ${skippedCount} خدمت از قبل موجود`);

    await Database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ خطا در migration خدمات:', error);
    await Database.disconnect();
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateServices();
}

