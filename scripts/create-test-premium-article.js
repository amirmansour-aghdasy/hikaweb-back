import mongoose from 'mongoose';
import { Article } from '../src/modules/articles/model.js';
import { Product } from '../src/modules/products/model.js';
import { Category } from '../src/modules/categories/model.js';
import { User } from '../src/modules/auth/model.js';
import { Database } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function createTestPremiumArticle() {
  try {
    await Database.connect();
    logger.info('✅ Connected to database');

    // Find or create premium category
    let premiumCategory = await Category.findOne({
      $or: [
        { 'name.fa': /ایده کسب و کار/i },
        { 'name.fa': /استراتژی کسب و کار/i },
        { 'slug.fa': /ایده-کسب-و-کار/i },
        { 'slug.fa': /استراتژی-کسب-و-کار/i }
      ],
      type: 'article',
      deletedAt: null
    });

    if (!premiumCategory) {
      // Create premium category if not exists
      premiumCategory = await Category.create({
        name: {
          fa: 'ایده کسب و کار',
          en: 'Business Idea'
        },
        slug: {
          fa: 'ایده-کسب-و-کار',
          en: 'business-idea'
        },
        type: 'article',
        level: 0,
        orderIndex: 0,
        isPublished: true,
        status: 'active'
      });
      logger.info('✅ Created premium category: ایده کسب و کار');
    } else {
      logger.info(`✅ Found premium category: ${premiumCategory.name.fa}`);
    }

    // Find admin user
    let adminUser = await User.findOne({ 
      email: { $in: ['admin@hikaweb.ir', 'admin@example.com'] },
      deletedAt: null
    }).sort({ createdAt: 1 });
    
    // If not found, get first user
    if (!adminUser) {
      const firstUser = await User.findOne({ deletedAt: null }).sort({ createdAt: 1 });
      if (!firstUser) {
        throw new Error('No user found in database');
      }
      logger.info(`✅ Using first user: ${firstUser.email}`);
      adminUser = firstUser;
    } else {
      logger.info(`✅ Found admin user: ${adminUser.email}`);
    }


    // Create digital product for article
    const productSku = `DIG-ARTICLE-${Date.now()}`;
    const product = await Product.create({
      name: {
        fa: 'مقاله تستی: راهنمای کامل راه‌اندازی کسب و کار',
        en: 'Test Article: Complete Guide to Starting a Business'
      },
      slug: {
        fa: 'مقاله-تستی-راهنمای-کامل-راه-اندازی-کسب-و-کار',
        en: 'test-article-complete-guide-starting-business'
      },
      sku: productSku,
      type: 'digital',
      digitalProduct: {
        contentType: 'article',
        downloadLimit: null,
        downloadExpiry: null
      },
      shortDescription: {
        fa: 'مقاله تخصصی و کامل درباره راه‌اندازی کسب و کار موفق',
        en: 'Complete professional article about starting a successful business'
      },
      description: {
        fa: 'این مقاله شامل تمام نکات مهم و ضروری برای راه‌اندازی یک کسب و کار موفق است. از ایده‌پردازی تا اجرا و مدیریت.',
        en: 'This article includes all important and essential points for starting a successful business. From ideation to execution and management.'
      },
      featuredImage: 'https://picsum.photos/seed/article/800/600',
      pricing: {
        basePrice: 50000,
        currency: 'IRR',
        isOnSale: false
      },
      categories: [premiumCategory._id],
      isPublished: true,
      status: 'active',
      createdBy: adminUser._id
    });
    logger.info(`✅ Created product: ${product.name.fa} (${product._id})`);

    // Create premium article
    const articleContent = `
      <h2>مقدمه</h2>
      <p>راه‌اندازی یک کسب و کار موفق یکی از چالش‌برانگیزترین و در عین حال پرارزش‌ترین تجربیات زندگی است. در این مقاله، به صورت کامل و جامع تمام مراحل راه‌اندازی کسب و کار را بررسی می‌کنیم.</p>
      
      <h2>مرحله اول: ایده‌پردازی</h2>
      <p>اولین و مهم‌ترین قدم در راه‌اندازی کسب و کار، داشتن یک ایده مناسب است. ایده شما باید:</p>
      <ul>
        <li>نیاز واقعی بازار را برطرف کند</li>
        <li>قابل اجرا و عملی باشد</li>
        <li>قابلیت مقیاس‌پذیری داشته باشد</li>
        <li>مزیت رقابتی داشته باشد</li>
      </ul>
      
      <h2>مرحله دوم: تحقیقات بازار</h2>
      <p>پس از انتخاب ایده، باید تحقیقات جامعی درباره بازار انجام دهید. این تحقیقات شامل:</p>
      <ul>
        <li>شناسایی مشتریان هدف</li>
        <li>تحلیل رقبا</li>
        <li>بررسی تقاضای بازار</li>
        <li>تعیین قیمت‌گذاری</li>
      </ul>
      
      <h2>مرحله سوم: برنامه‌ریزی کسب و کار</h2>
      <p>یک برنامه کسب و کار جامع شامل:</p>
      <ul>
        <li>بیانیه ماموریت و چشم‌انداز</li>
        <li>تحلیل SWOT</li>
        <li>استراتژی بازاریابی</li>
        <li>برنامه مالی</li>
        <li>ساختار سازمانی</li>
      </ul>
      
      <h2>مرحله چهارم: تامین مالی</h2>
      <p>برای راه‌اندازی کسب و کار، نیاز به سرمایه اولیه دارید. منابع تامین مالی شامل:</p>
      <ul>
        <li>سرمایه شخصی</li>
        <li>وام بانکی</li>
        <li>سرمایه‌گذاران</li>
        <li>کمک‌های دولتی</li>
      </ul>
      
      <h2>مرحله پنجم: اجرا و راه‌اندازی</h2>
      <p>پس از تامین مالی، نوبت به اجرای برنامه می‌رسد. این مرحله شامل:</p>
      <ul>
        <li>ثبت شرکت</li>
        <li>اجاره یا خرید محل کار</li>
        <li>خرید تجهیزات</li>
        <li>استخدام نیروی انسانی</li>
        <li>راه‌اندازی سیستم‌ها</li>
      </ul>
      
      <h2>مرحله ششم: بازاریابی و فروش</h2>
      <p>برای موفقیت کسب و کار، باید استراتژی بازاریابی موثری داشته باشید:</p>
      <ul>
        <li>بازاریابی دیجیتال</li>
        <li>بازاریابی شبکه‌های اجتماعی</li>
        <li>بازاریابی محتوا</li>
        <li>روابط عمومی</li>
      </ul>
      
      <h2>مرحله هفتم: مدیریت و رشد</h2>
      <p>پس از راه‌اندازی، باید کسب و کار را به درستی مدیریت کنید:</p>
      <ul>
        <li>مدیریت مالی</li>
        <li>مدیریت منابع انسانی</li>
        <li>بهبود مستمر</li>
        <li>برنامه‌ریزی برای رشد</li>
      </ul>
      
      <h2>نتیجه‌گیری</h2>
      <p>راه‌اندازی کسب و کار موفق نیاز به برنامه‌ریزی دقیق، اجرای صحیح و مدیریت مداوم دارد. با پیروی از مراحل فوق و استفاده از تجربیات موفق، می‌توانید کسب و کاری پایدار و سودآور راه‌اندازی کنید.</p>
    `;

    const article = await Article.create({
      title: {
        fa: 'راهنمای کامل راه‌اندازی کسب و کار موفق',
        en: 'Complete Guide to Starting a Successful Business'
      },
      slug: {
        fa: 'راهنمای-کامل-راه-اندازی-کسب-و-کار-موفق',
        en: 'complete-guide-starting-successful-business'
      },
      excerpt: {
        fa: 'مقاله جامع و تخصصی درباره تمام مراحل راه‌اندازی یک کسب و کار موفق، از ایده‌پردازی تا مدیریت و رشد.',
        en: 'Comprehensive and professional article about all stages of starting a successful business, from ideation to management and growth.'
      },
      content: {
        fa: articleContent,
        en: articleContent
      },
      featuredImage: 'https://picsum.photos/seed/business/800/600',
      author: adminUser._id,
      categories: [premiumCategory._id],
      tags: {
        fa: ['کسب و کار', 'راه‌اندازی', 'کارآفرینی', 'مدیریت', 'بازاریابی'],
        en: ['business', 'startup', 'entrepreneurship', 'management', 'marketing']
      },
      isPublished: true,
      isFeatured: true,
      isPremium: true,
      relatedProduct: product._id,
      publishedAt: new Date(),
      createdBy: adminUser._id
    });

    // Calculate read time
    article.calculateReadTime();
    await article.save();

    logger.info(`✅ Created premium article: ${article.title.fa}`);
    logger.info(`   Article ID: ${article._id}`);
    logger.info(`   Product ID: ${product._id}`);
    logger.info(`   Category: ${premiumCategory.name.fa}`);
    logger.info(`   Article URL: http://localhost:3001/mag/${article.slug.fa}`);
    logger.info(`   Product URL: http://localhost:3001/product/${product.slug.fa}`);

    console.log('\n🎉 مقاله تستی خریدنی با موفقیت ایجاد شد!');
    console.log(`\n📄 مقاله:`);
    console.log(`   عنوان: ${article.title.fa}`);
    console.log(`   آدرس: http://localhost:3001/mag/${article.slug.fa}`);
    console.log(`   شناسه: ${article._id}`);
    console.log(`\n🛒 محصول:`);
    console.log(`   نام: ${product.name.fa}`);
    console.log(`   آدرس: http://localhost:3001/product/${product.slug.fa}`);
    console.log(`   شناسه: ${product._id}`);
    console.log(`   قیمت: ${product.pricing.basePrice.toLocaleString('fa-IR')} تومان`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error creating test premium article:', error);
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createTestPremiumArticle();

