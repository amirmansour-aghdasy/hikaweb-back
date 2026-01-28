/**
 * Script to create 20 test products for the shop
 * Run with: node back/scripts/create-test-products.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';
import { Category } from '../src/modules/categories/model.js';
import { User } from '../src/modules/auth/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

// Test products data
const testProducts = [
  // Digital Products
  {
    name: { fa: 'دوره آموزشی React پیشرفته', en: 'Advanced React Course' },
    slug: { fa: 'دوره-آموزشی-react-پیشرفته', en: 'advanced-react-course' },
    shortDescription: { fa: 'دوره کامل و جامع React با پروژه‌های واقعی', en: 'Complete React course with real projects' },
    description: { fa: 'این دوره شامل تمام مباحث پیشرفته React از جمله Hooks، Context API، Performance Optimization و ... است.', en: 'This course covers all advanced React topics including Hooks, Context API, Performance Optimization, etc.' },
    type: 'digital',
    sku: 'DIG-REACT-001',
    pricing: {
      basePrice: 2990000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 1990000,
      compareAtPrice: 3990000,
    },
    digitalProduct: {
      fileSize: 2048000000, // 2GB
      fileType: 'ZIP',
      downloadLimit: 5,
    },
    categories: [],
    tags: {
      fa: ['react', 'javascript', 'frontend', 'programming'],
      en: ['react', 'javascript', 'frontend', 'programming'],
    },
    featuredImage: '/assets/products/react-course.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: true,
    inventory: {
      trackInventory: false,
      quantity: 0,
      stockStatus: 'in_stock',
    },
    rating: {
      average: 4.8,
      count: 125,
    },
    views: 1500,
    likes: 89,
    suitableFor: {
      fa: ['توسعه‌دهندگان Frontend', 'برنامه‌نویسان JavaScript', 'علاقه‌مندان به React'],
      en: ['Frontend Developers', 'JavaScript Programmers', 'React Enthusiasts'],
    },
    loyaltyPoints: {
      earnOnPurchase: 199,
      requiredForDiscount: 1000,
    },
  },
  {
    name: { fa: 'قالب HTML حرفه‌ای', en: 'Professional HTML Template' },
    slug: { fa: 'قالب-html-حرفه-ای', en: 'professional-html-template' },
    shortDescription: { fa: 'قالب HTML5 مدرن و ریسپانسیو برای وب‌سایت‌های شرکتی', en: 'Modern responsive HTML5 template for corporate websites' },
    description: { fa: 'قالب کامل با تمام صفحات مورد نیاز شامل صفحه اصلی، درباره ما، خدمات، تماس و ...', en: 'Complete template with all necessary pages including home, about, services, contact, etc.' },
    type: 'digital',
    sku: 'DIG-HTML-001',
    pricing: {
      basePrice: 1490000,
      currency: 'IRR',
      isOnSale: false,
    },
    digitalProduct: {
      fileSize: 52428800, // 50MB
      fileType: 'ZIP',
      downloadLimit: 3,
    },
    categories: [],
    tags: { fa: ['html', 'template', 'responsive', 'bootstrap'], en: ['html', 'template', 'responsive', 'bootstrap'] },
    featuredImage: '/assets/products/html-template.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: false,
      quantity: 0,
      stockStatus: 'in_stock',
    },
    rating: {
      average: 4.5,
      count: 67,
    },
    views: 890,
    likes: 45,
    suitableFor: {
      fa: ['طراحان وب', 'توسعه‌دهندگان Frontend', 'استارتاپ‌ها'],
      en: ['Web Designers', 'Frontend Developers', 'Startups'],
    },
    loyaltyPoints: {
      earnOnPurchase: 149,
    },
  },
  {
    name: { fa: 'پلاگین WordPress برای فروشگاه', en: 'WordPress E-commerce Plugin' },
    slug: { fa: 'پلاگین-wordpress-فروشگاه', en: 'wordpress-ecommerce-plugin' },
    shortDescription: { fa: 'پلاگین کامل فروشگاه آنلاین برای WordPress', en: 'Complete e-commerce plugin for WordPress' },
    description: { fa: 'پلاگین قدرتمند با تمام ویژگی‌های مورد نیاز یک فروشگاه آنلاین', en: 'Powerful plugin with all features needed for an online store' },
    type: 'digital',
    sku: 'DIG-WP-001',
    pricing: {
      basePrice: 4990000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 3490000,
    },
    digitalProduct: {
      fileSize: 10485760, // 10MB
      fileType: 'ZIP',
      downloadLimit: -1, // Unlimited
    },
    categories: [],
    tags: { fa: ['wordpress', 'plugin', 'ecommerce', 'woocommerce'], en: ['wordpress', 'plugin', 'ecommerce', 'woocommerce'] },
    featuredImage: '/assets/products/wp-plugin.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: true,
    inventory: {
      trackInventory: false,
      quantity: 0,
      stockStatus: 'in_stock',
    },
    rating: {
      average: 4.9,
      count: 234,
    },
    views: 3200,
    likes: 156,
    suitableFor: {
      fa: ['مدیران سایت WordPress', 'توسعه‌دهندگان PHP', 'فروشگاه‌داران آنلاین'],
      en: ['WordPress Site Administrators', 'PHP Developers', 'Online Store Owners'],
    },
    loyaltyPoints: {
      earnOnPurchase: 349,
    },
  },
  {
    name: { fa: 'کتاب الکترونیکی طراحی UI/UX', en: 'UI/UX Design E-book' },
    slug: { fa: 'کتاب-الکترونیکی-طراحی-ui-ux', en: 'ui-ux-design-ebook' },
    shortDescription: { fa: 'راهنمای کامل طراحی رابط کاربری و تجربه کاربری', en: 'Complete guide to UI/UX design' },
    description: { fa: 'کتاب جامع شامل اصول طراحی، ابزارها، تکنیک‌ها و نمونه‌های عملی', en: 'Comprehensive book covering design principles, tools, techniques, and practical examples' },
    type: 'digital',
    sku: 'DIG-BOOK-001',
    pricing: {
      basePrice: 990000,
      currency: 'IRR',
      isOnSale: false,
    },
    digitalProduct: {
      fileSize: 52428800, // 50MB
      fileType: 'PDF',
      downloadLimit: 10,
    },
    categories: [],
    tags: { fa: ['design', 'ui', 'ux', 'ebook', 'book'], en: ['design', 'ui', 'ux', 'ebook', 'book'] },
    featuredImage: '/assets/products/ui-ux-book.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: false,
      quantity: 0,
      stockStatus: 'in_stock',
    },
    rating: {
      average: 4.6,
      count: 89,
    },
    views: 1200,
    likes: 67,
    suitableFor: {
      fa: ['طراحان UI/UX', 'گرافیست‌ها', 'توسعه‌دهندگان Frontend'],
      en: ['UI/UX Designers', 'Graphic Designers', 'Frontend Developers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 99,
    },
  },
  {
    name: { fa: 'آیکون‌ست حرفه‌ای', en: 'Professional Icon Set' },
    slug: { fa: 'آیکون-ست-حرفه-ای', en: 'professional-icon-set' },
    shortDescription: { fa: 'مجموعه کامل آیکون‌های SVG و PNG با کیفیت بالا', en: 'Complete set of high-quality SVG and PNG icons' },
    description: { fa: 'بیش از 1000 آیکون در فرمت‌های مختلف با لایسنس تجاری', en: 'Over 1000 icons in various formats with commercial license' },
    type: 'digital',
    sku: 'DIG-ICON-001',
    pricing: {
      basePrice: 790000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 490000,
    },
    digitalProduct: {
      fileSize: 15728640, // 15MB
      fileType: 'ZIP',
      downloadLimit: -1,
    },
    categories: [],
    tags: { fa: ['icons', 'svg', 'png', 'design', 'graphics'], en: ['icons', 'svg', 'png', 'design', 'graphics'] },
    featuredImage: '/assets/products/icon-set.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: false,
      quantity: 0,
      stockStatus: 'in_stock',
    },
    rating: {
      average: 4.7,
      count: 112,
    },
    views: 980,
    likes: 54,
    suitableFor: {
      fa: ['طراحان گرافیک', 'توسعه‌دهندگان', 'طراحان UI'],
      en: ['Graphic Designers', 'Developers', 'UI Designers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 49,
    },
  },
  // Physical Products
  {
    name: { fa: 'کیبورد مکانیکی RGB', en: 'RGB Mechanical Keyboard' },
    slug: { fa: 'کیبورد-مکانیکی-rgb', en: 'rgb-mechanical-keyboard' },
    shortDescription: { fa: 'کیبورد مکانیکی با نورپردازی RGB و سوئیچ‌های Cherry MX', en: 'Mechanical keyboard with RGB lighting and Cherry MX switches' },
    description: { fa: 'کیبورد حرفه‌ای با طراحی ارگونومیک و قابلیت‌های پیشرفته برای گیمرها و برنامه‌نویسان', en: 'Professional keyboard with ergonomic design and advanced features for gamers and programmers' },
    type: 'physical',
    sku: 'PHY-KB-001',
    pricing: {
      basePrice: 8900000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 6990000,
      compareAtPrice: 10900000,
    },
    physicalProduct: {
      weight: 1200, // grams
      dimensions: {
        length: 45,
        width: 15,
        height: 3,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['keyboard', 'mechanical', 'rgb', 'gaming', 'computer'], en: ['keyboard', 'mechanical', 'rgb', 'gaming', 'computer'] },
    featuredImage: '/assets/products/keyboard.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: true,
    inventory: {
      trackInventory: true,
      quantity: 25,
      lowStockThreshold: 10,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.8,
      count: 156,
    },
    views: 2100,
    likes: 134,
    suitableFor: {
      fa: ['گیمرها', 'برنامه‌نویسان', 'طراحان'],
      en: ['Gamers', 'Programmers', 'Designers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 699,
    },
  },
  {
    name: { fa: 'ماوس بی‌سیم گیمینگ', en: 'Wireless Gaming Mouse' },
    slug: { fa: 'ماوس-بی-سیم-گیمینگ', en: 'wireless-gaming-mouse' },
    shortDescription: { fa: 'ماوس حرفه‌ای با دقت بالا و باتری قابل شارژ', en: 'Professional mouse with high precision and rechargeable battery' },
    description: { fa: 'ماوس بی‌سیم با سنسور 16000 DPI و طراحی ارگونومیک برای استفاده طولانی مدت', en: 'Wireless mouse with 16000 DPI sensor and ergonomic design for long-term use' },
    type: 'physical',
    sku: 'PHY-MOUSE-001',
    pricing: {
      basePrice: 2990000,
      currency: 'IRR',
      isOnSale: false,
    },
    physicalProduct: {
      weight: 120,
      dimensions: {
        length: 12,
        width: 6,
        height: 4,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['mouse', 'wireless', 'gaming', 'computer', 'accessories'], en: ['mouse', 'wireless', 'gaming', 'computer', 'accessories'] },
    featuredImage: '/assets/products/mouse.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 50,
      lowStockThreshold: 15,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.6,
      count: 98,
    },
    views: 1450,
    likes: 78,
    suitableFor: {
      fa: ['گیمرها', 'کاربران حرفه‌ای', 'طراحان'],
      en: ['Gamers', 'Professional Users', 'Designers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 299,
    },
  },
  {
    name: { fa: 'مانیتور 27 اینچ 4K', en: '27 Inch 4K Monitor' },
    slug: { fa: 'مانیتور-27-اینچ-4k', en: '27-inch-4k-monitor' },
    shortDescription: { fa: 'مانیتور حرفه‌ای با رزولوشن 4K و پشتیبانی از HDR', en: 'Professional monitor with 4K resolution and HDR support' },
    description: { fa: 'مانیتور 27 اینچی با پنل IPS، رفرش ریت 144Hz و پورت‌های متعدد', en: '27-inch monitor with IPS panel, 144Hz refresh rate and multiple ports' },
    type: 'physical',
    sku: 'PHY-MON-001',
    pricing: {
      basePrice: 25000000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 19900000,
      compareAtPrice: 29900000,
    },
    physicalProduct: {
      weight: 5500,
      dimensions: {
        length: 61,
        width: 36,
        height: 20,
      },
      shippingClass: 'fragile',
    },
    categories: [],
    tags: { fa: ['monitor', '4k', 'display', 'computer', 'gaming'], en: ['monitor', '4k', 'display', 'computer', 'gaming'] },
    featuredImage: '/assets/products/monitor.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: true,
    inventory: {
      trackInventory: true,
      quantity: 12,
      lowStockThreshold: 5,
      stockStatus: 'in_stock',
      allowBackorder: true,
    },
    rating: {
      average: 4.9,
      count: 67,
    },
    views: 3200,
    likes: 189,
    suitableFor: {
      fa: ['طراحان گرافیک', 'گیمرها', 'کاربران حرفه‌ای'],
      en: ['Graphic Designers', 'Gamers', 'Professional Users'],
    },
    loyaltyPoints: {
      earnOnPurchase: 1990,
    },
  },
  {
    name: { fa: 'هدفون بی‌سیم نویز کنسلینگ', en: 'Wireless Noise Cancelling Headphones' },
    slug: { fa: 'هدفون-بی-سیم-نویز-کنسلینگ', en: 'wireless-noise-cancelling-headphones' },
    shortDescription: { fa: 'هدفون حرفه‌ای با حذف نویز فعال و کیفیت صدای بالا', en: 'Professional headphones with active noise cancellation and high sound quality' },
    description: { fa: 'هدفون بی‌سیم با باتری 30 ساعته، بلوتوث 5.0 و میکروفون با کیفیت', en: 'Wireless headphones with 30-hour battery, Bluetooth 5.0 and quality microphone' },
    type: 'physical',
    sku: 'PHY-HP-001',
    pricing: {
      basePrice: 12900000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 9990000,
    },
    physicalProduct: {
      weight: 350,
      dimensions: {
        length: 20,
        width: 18,
        height: 8,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['headphones', 'wireless', 'audio', 'music', 'noise-cancelling'], en: ['headphones', 'wireless', 'audio', 'music', 'noise-cancelling'] },
    featuredImage: '/assets/products/headphones.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 30,
      lowStockThreshold: 10,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.7,
      count: 145,
    },
    views: 1800,
    likes: 112,
    suitableFor: {
      fa: ['علاقه‌مندان به موسیقی', 'کاربران حرفه‌ای', 'مسافران'],
      en: ['Music Enthusiasts', 'Professional Users', 'Travelers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 999,
    },
  },
  {
    name: { fa: 'وب‌کم HD 1080p', en: 'HD 1080p Webcam' },
    slug: { fa: 'وب-کم-hd-1080p', en: 'hd-1080p-webcam' },
    shortDescription: { fa: 'وب‌کم با کیفیت HD و میکروفون داخلی', en: 'HD webcam with built-in microphone' },
    description: { fa: 'وب‌کم حرفه‌ای با رزولوشن 1080p، میکروفون استریو و نورپردازی خودکار', en: 'Professional webcam with 1080p resolution, stereo microphone and auto lighting' },
    type: 'physical',
    sku: 'PHY-WC-001',
    pricing: {
      basePrice: 3990000,
      currency: 'IRR',
      isOnSale: false,
    },
    physicalProduct: {
      weight: 150,
      dimensions: {
        length: 10,
        width: 3,
        height: 3,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['webcam', 'camera', 'video', 'streaming', 'computer'], en: ['webcam', 'camera', 'video', 'streaming', 'computer'] },
    featuredImage: '/assets/products/webcam.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 40,
      lowStockThreshold: 15,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.5,
      count: 78,
    },
    views: 1100,
    likes: 56,
    suitableFor: {
      fa: ['استریمرها', 'کاربران ویدیو کنفرانس', 'یوتیوبرها'],
      en: ['Streamers', 'Video Conference Users', 'YouTubers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 399,
    },
  },
  {
    name: { fa: 'هارد اکسترنال 2 ترابایت', en: '2TB External Hard Drive' },
    slug: { fa: 'هارد-اکسترنال-2-ترابایت', en: '2tb-external-hard-drive' },
    shortDescription: { fa: 'هارد اکسترنال پرتابل با ظرفیت 2 ترابایت', en: 'Portable external hard drive with 2TB capacity' },
    description: { fa: 'هارد اکسترنال USB 3.0 با سرعت بالا و طراحی مقاوم', en: 'USB 3.0 external hard drive with high speed and durable design' },
    type: 'physical',
    sku: 'PHY-HDD-001',
    pricing: {
      basePrice: 5990000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 4490000,
    },
    physicalProduct: {
      weight: 200,
      dimensions: {
        length: 12,
        width: 8,
        height: 1.5,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['hard-drive', 'storage', 'usb', 'backup', 'computer'], en: ['hard-drive', 'storage', 'usb', 'backup', 'computer'] },
    featuredImage: '/assets/products/hard-drive.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 35,
      lowStockThreshold: 10,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.6,
      count: 92,
    },
    views: 1350,
    likes: 64,
    suitableFor: {
      fa: ['کاربران حرفه‌ای', 'دانشجویان', 'ادمین‌های سیستم'],
      en: ['Professional Users', 'Students', 'System Administrators'],
    },
    loyaltyPoints: {
      earnOnPurchase: 449,
    },
  },
  {
    name: { fa: 'کیس کامپیوتر گیمینگ RGB', en: 'RGB Gaming PC Case' },
    slug: { fa: 'کیس-کامپیوتر-گیمینگ-rgb', en: 'rgb-gaming-pc-case' },
    shortDescription: { fa: 'کیس حرفه‌ای با نورپردازی RGB و طراحی مدرن', en: 'Professional case with RGB lighting and modern design' },
    description: { fa: 'کیس گیمینگ با شیشه تمپرد، فیلترهای گرد و غبار و سیستم خنک‌کننده پیشرفته', en: 'Gaming case with tempered glass, dust filters and advanced cooling system' },
    type: 'physical',
    sku: 'PHY-CASE-001',
    pricing: {
      basePrice: 7990000,
      currency: 'IRR',
      isOnSale: false,
    },
    physicalProduct: {
      weight: 8500,
      dimensions: {
        length: 50,
        width: 25,
        height: 50,
      },
      shippingClass: 'heavy',
    },
    categories: [],
    tags: { fa: ['case', 'pc', 'gaming', 'rgb', 'computer'], en: ['case', 'pc', 'gaming', 'rgb', 'computer'] },
    featuredImage: '/assets/products/pc-case.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 18,
      lowStockThreshold: 5,
      stockStatus: 'in_stock',
      allowBackorder: true,
    },
    rating: {
      average: 4.7,
      count: 123,
    },
    views: 1650,
    likes: 98,
    suitableFor: {
      fa: ['گیمرها', 'اسمبلرهای کامپیوتر', 'علاقه‌مندان به سخت‌افزار'],
      en: ['Gamers', 'PC Builders', 'Hardware Enthusiasts'],
    },
    loyaltyPoints: {
      earnOnPurchase: 799,
    },
  },
  {
    name: { fa: 'مک‌بوک پرو 13 اینچ', en: 'MacBook Pro 13 Inch' },
    slug: { fa: 'مک-بوک-پرو-13-اینچ', en: 'macbook-pro-13-inch' },
    shortDescription: { fa: 'لپ‌تاپ اپل با پردازنده M2 و صفحه نمایش Retina', en: 'Apple laptop with M2 processor and Retina display' },
    description: { fa: 'مک‌بوک پرو با 256GB SSD، 8GB RAM و باتری 20 ساعته', en: 'MacBook Pro with 256GB SSD, 8GB RAM and 20-hour battery' },
    type: 'physical',
    sku: 'PHY-MBP-001',
    pricing: {
      basePrice: 85000000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 79900000,
      compareAtPrice: 95000000,
    },
    physicalProduct: {
      weight: 1400,
      dimensions: {
        length: 30,
        width: 21,
        height: 1.5,
      },
      shippingClass: 'fragile',
    },
    categories: [],
    tags: { fa: ['laptop', 'macbook', 'apple', 'computer', 'professional'], en: ['laptop', 'macbook', 'apple', 'computer', 'professional'] },
    featuredImage: '/assets/products/macbook.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: true,
    inventory: {
      trackInventory: true,
      quantity: 5,
      lowStockThreshold: 3,
      stockStatus: 'low_stock',
      allowBackorder: true,
    },
    rating: {
      average: 4.9,
      count: 234,
    },
    views: 4500,
    likes: 267,
    suitableFor: {
      fa: ['توسعه‌دهندگان', 'طراحان', 'کاربران حرفه‌ای'],
      en: ['Developers', 'Designers', 'Professional Users'],
    },
    loyaltyPoints: {
      earnOnPurchase: 7990,
    },
  },
  {
    name: { fa: 'تبلت سامسونگ گلکسی', en: 'Samsung Galaxy Tablet' },
    slug: { fa: 'تبلت-سامسونگ-گلکسی', en: 'samsung-galaxy-tablet' },
    shortDescription: { fa: 'تبلت 10 اینچی با صفحه نمایش AMOLED و قلم S Pen', en: '10-inch tablet with AMOLED display and S Pen' },
    description: { fa: 'تبلت حرفه‌ای با پردازنده قدرتمند، دوربین دوگانه و باتری 8000 میلی‌آمپر', en: 'Professional tablet with powerful processor, dual camera and 8000mAh battery' },
    type: 'physical',
    sku: 'PHY-TAB-001',
    pricing: {
      basePrice: 35000000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 29900000,
    },
    physicalProduct: {
      weight: 500,
      dimensions: {
        length: 25,
        width: 16,
        height: 0.7,
      },
      shippingClass: 'fragile',
    },
    categories: [],
    tags: { fa: ['tablet', 'samsung', 'android', 'mobile', 'pen'], en: ['tablet', 'samsung', 'android', 'mobile', 'pen'] },
    featuredImage: '/assets/products/tablet.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 15,
      lowStockThreshold: 5,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.6,
      count: 156,
    },
    views: 2200,
    likes: 134,
    suitableFor: {
      fa: ['دانشجویان', 'طراحان', 'کاربران حرفه‌ای'],
      en: ['Students', 'Designers', 'Professional Users'],
    },
    loyaltyPoints: {
      earnOnPurchase: 2990,
    },
  },
  {
    name: { fa: 'اسپیکر بلوتوث قابل حمل', en: 'Portable Bluetooth Speaker' },
    slug: { fa: 'اسپیکر-بلوتوث-قابل-حمل', en: 'portable-bluetooth-speaker' },
    shortDescription: { fa: 'اسپیکر بی‌سیم با کیفیت صدای بالا و مقاوم در برابر آب', en: 'Wireless speaker with high sound quality and water resistant' },
    description: { fa: 'اسپیکر قابل حمل با باتری 12 ساعته، بلوتوث 5.0 و مقاومت IPX7', en: 'Portable speaker with 12-hour battery, Bluetooth 5.0 and IPX7 resistance' },
    type: 'physical',
    sku: 'PHY-SPK-001',
    pricing: {
      basePrice: 2490000,
      currency: 'IRR',
      isOnSale: false,
    },
    physicalProduct: {
      weight: 600,
      dimensions: {
        length: 20,
        width: 7,
        height: 7,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['speaker', 'bluetooth', 'audio', 'portable', 'music'], en: ['speaker', 'bluetooth', 'audio', 'portable', 'music'] },
    featuredImage: '/assets/products/speaker.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 45,
      lowStockThreshold: 15,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.5,
      count: 87,
    },
    views: 980,
    likes: 52,
    suitableFor: {
      fa: ['علاقه‌مندان به موسیقی', 'مسافران', 'کاربران خانگی'],
      en: ['Music Enthusiasts', 'Travelers', 'Home Users'],
    },
    loyaltyPoints: {
      earnOnPurchase: 249,
    },
  },
  {
    name: { fa: 'کیبورد و ماوس بی‌سیم ست', en: 'Wireless Keyboard and Mouse Set' },
    slug: { fa: 'کیبورد-و-ماوس-بی-سیم-ست', en: 'wireless-keyboard-mouse-set' },
    shortDescription: { fa: 'ست کامل کیبورد و ماوس بی‌سیم با طراحی ارگونومیک', en: 'Complete wireless keyboard and mouse set with ergonomic design' },
    description: { fa: 'ست کامل با یک دنگل USB، باتری قابل شارژ و طراحی راحت', en: 'Complete set with one USB dongle, rechargeable battery and comfortable design' },
    type: 'physical',
    sku: 'PHY-KMS-001',
    pricing: {
      basePrice: 1990000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 1490000,
    },
    physicalProduct: {
      weight: 800,
      dimensions: {
        length: 40,
        width: 20,
        height: 5,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['keyboard', 'mouse', 'wireless', 'set', 'computer'], en: ['keyboard', 'mouse', 'wireless', 'set', 'computer'] },
    featuredImage: '/assets/products/kb-mouse-set.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 60,
      lowStockThreshold: 20,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.4,
      count: 112,
    },
    views: 1100,
    likes: 68,
    suitableFor: {
      fa: ['کاربران خانگی', 'اداری', 'دانشجویان'],
      en: ['Home Users', 'Office', 'Students'],
    },
    loyaltyPoints: {
      earnOnPurchase: 149,
    },
  },
  {
    name: { fa: 'دوربین وبلاگ 4K', en: '4K Vlog Camera' },
    slug: { fa: 'دوربین-وبلاگ-4k', en: '4k-vlog-camera' },
    shortDescription: { fa: 'دوربین حرفه‌ای برای ویدیو بلاگ با رزولوشن 4K', en: 'Professional camera for vlogging with 4K resolution' },
    description: { fa: 'دوربین با صفحه نمایش چرخان، میکروفون استریو و تثبیت‌کننده تصویر', en: 'Camera with rotating screen, stereo microphone and image stabilizer' },
    type: 'physical',
    sku: 'PHY-CAM-001',
    pricing: {
      basePrice: 45000000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 39900000,
      compareAtPrice: 55000000,
    },
    physicalProduct: {
      weight: 500,
      dimensions: {
        length: 12,
        width: 8,
        height: 5,
      },
      shippingClass: 'fragile',
    },
    categories: [],
    tags: { fa: ['camera', 'vlog', '4k', 'video', 'youtube'], en: ['camera', 'vlog', '4k', 'video', 'youtube'] },
    featuredImage: '/assets/products/camera.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: true,
    inventory: {
      trackInventory: true,
      quantity: 8,
      lowStockThreshold: 3,
      stockStatus: 'in_stock',
      allowBackorder: true,
    },
    rating: {
      average: 4.8,
      count: 89,
    },
    views: 2800,
    likes: 145,
    suitableFor: {
      fa: ['یوتیوبرها', 'ویدیو بلاگرها', 'محتوا سازان'],
      en: ['YouTubers', 'Vloggers', 'Content Creators'],
    },
    loyaltyPoints: {
      earnOnPurchase: 3990,
    },
  },
  {
    name: { fa: 'میکروفون USB حرفه‌ای', en: 'Professional USB Microphone' },
    slug: { fa: 'میکروفون-usb-حرفه-ای', en: 'professional-usb-microphone' },
    shortDescription: { fa: 'میکروفون استودیویی با کیفیت صدای بالا', en: 'Studio microphone with high sound quality' },
    description: { fa: 'میکروفون USB با الگوی کاردیوئید، فیلتر نویز و پایه قابل تنظیم', en: 'USB microphone with cardioid pattern, noise filter and adjustable stand' },
    type: 'physical',
    sku: 'PHY-MIC-001',
    pricing: {
      basePrice: 5990000,
      currency: 'IRR',
      isOnSale: false,
    },
    physicalProduct: {
      weight: 800,
      dimensions: {
        length: 15,
        width: 5,
        height: 25,
      },
      shippingClass: 'fragile',
    },
    categories: [],
    tags: { fa: ['microphone', 'usb', 'audio', 'streaming', 'podcast'], en: ['microphone', 'usb', 'audio', 'streaming', 'podcast'] },
    featuredImage: '/assets/products/microphone.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 22,
      lowStockThreshold: 8,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.7,
      count: 134,
    },
    views: 1750,
    likes: 98,
    suitableFor: {
      fa: ['استریمرها', 'پادکسترها', 'خوانندگان'],
      en: ['Streamers', 'Podcasters', 'Singers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 599,
    },
  },
  {
    name: { fa: 'پاوربانک 20000 میلی‌آمپر', en: '20000mAh Power Bank' },
    slug: { fa: 'پاوربانک-20000-میلی-آمپر', en: '20000mah-power-bank' },
    shortDescription: { fa: 'پاوربانک پرظرفیت با شارژ سریع و پورت USB-C', en: 'High-capacity power bank with fast charging and USB-C port' },
    description: { fa: 'پاوربانک با ظرفیت 20000 میلی‌آمپر، شارژ سریع 18W و طراحی مقاوم', en: 'Power bank with 20000mAh capacity, 18W fast charging and durable design' },
    type: 'physical',
    sku: 'PHY-PB-001',
    pricing: {
      basePrice: 1990000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 1490000,
    },
    physicalProduct: {
      weight: 400,
      dimensions: {
        length: 15,
        width: 7,
        height: 2,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['power-bank', 'charger', 'battery', 'mobile', 'portable'], en: ['power-bank', 'charger', 'battery', 'mobile', 'portable'] },
    featuredImage: '/assets/products/powerbank.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 55,
      lowStockThreshold: 20,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.5,
      count: 156,
    },
    views: 1300,
    likes: 87,
    suitableFor: {
      fa: ['مسافران', 'کاربران موبایل', 'دانشجویان'],
      en: ['Travelers', 'Mobile Users', 'Students'],
    },
    loyaltyPoints: {
      earnOnPurchase: 149,
    },
  },
  {
    name: { fa: 'کیف لپ‌تاپ ضد آب', en: 'Waterproof Laptop Bag' },
    slug: { fa: 'کیف-لپ-تاپ-ضد-آب', en: 'waterproof-laptop-bag' },
    shortDescription: { fa: 'کیف محافظ لپ‌تاپ با طراحی ضد آب و جیب‌های متعدد', en: 'Laptop protection bag with waterproof design and multiple pockets' },
    description: { fa: 'کیف مقاوم با پد محافظ، بند شانه قابل تنظیم و طراحی مدرن', en: 'Durable bag with protective padding, adjustable shoulder strap and modern design' },
    type: 'physical',
    sku: 'PHY-BAG-001',
    pricing: {
      basePrice: 1490000,
      currency: 'IRR',
      isOnSale: false,
    },
    physicalProduct: {
      weight: 800,
      dimensions: {
        length: 40,
        width: 30,
        height: 5,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['bag', 'laptop', 'waterproof', 'accessories', 'travel'], en: ['bag', 'laptop', 'waterproof', 'accessories', 'travel'] },
    featuredImage: '/assets/products/laptop-bag.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 40,
      lowStockThreshold: 15,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.4,
      count: 78,
    },
    views: 950,
    likes: 45,
    suitableFor: {
      fa: ['دانشجویان', 'کاربران لپ‌تاپ', 'مسافران'],
      en: ['Students', 'Laptop Users', 'Travelers'],
    },
    loyaltyPoints: {
      earnOnPurchase: 149,
    },
  },
  {
    name: { fa: 'کابل USB-C به USB-C', en: 'USB-C to USB-C Cable' },
    slug: { fa: 'کابل-usb-c-به-usb-c', en: 'usb-c-to-usb-c-cable' },
    shortDescription: { fa: 'کابل USB-C با پشتیبانی از شارژ سریع و انتقال داده', en: 'USB-C cable with fast charging and data transfer support' },
    description: { fa: 'کابل 2 متری با پشتیبانی از شارژ 100W و انتقال داده USB 3.1', en: '2-meter cable with 100W charging support and USB 3.1 data transfer' },
    type: 'physical',
    sku: 'PHY-CBL-001',
    pricing: {
      basePrice: 490000,
      currency: 'IRR',
      isOnSale: true,
      salePrice: 290000,
    },
    physicalProduct: {
      weight: 50,
      dimensions: {
        length: 200,
        width: 0.5,
        height: 0.5,
      },
      shippingClass: 'standard',
    },
    categories: [],
    tags: { fa: ['cable', 'usb-c', 'charger', 'accessories', 'mobile'], en: ['cable', 'usb-c', 'charger', 'accessories', 'mobile'] },
    featuredImage: '/assets/products/usb-cable.jpg',
    gallery: [],
    isPublished: true,
    status: 'active',
    isFeatured: false,
    inventory: {
      trackInventory: true,
      quantity: 100,
      lowStockThreshold: 30,
      stockStatus: 'in_stock',
      allowBackorder: false,
    },
    rating: {
      average: 4.3,
      count: 234,
    },
    views: 800,
    likes: 56,
    suitableFor: {
      fa: ['کاربران موبایل', 'کاربران لپ‌تاپ', 'همه'],
      en: ['Mobile Users', 'Laptop Users', 'Everyone'],
    },
    loyaltyPoints: {
      earnOnPurchase: 29,
    },
  },
];

async function createTestProducts() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get admin user for createdBy
    let adminUser = await User.findOne({ email: 'mahdisahebelm@gmail.com' });
    if (!adminUser) {
      // Try to get any admin user
      adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        // Get first user
        adminUser = await User.findOne();
        if (!adminUser) {
          console.warn('⚠️  No user found. Products will be created without createdBy.');
        }
      }
    }

    // Get or create a product category
    let productCategory = await Category.findOne({ type: 'product', 'name.fa': 'الکترونیک' });
    if (!productCategory) {
      productCategory = await Category.create({
        name: { fa: 'الکترونیک', en: 'Electronics' },
        slug: { fa: 'الکترونیک', en: 'electronics' },
        type: 'product',
        status: 'active',
        isPublished: true,
      });
      console.log('Created product category: الکترونیک');
    }

    // Add category to all products and prepare them
    const categoryId = productCategory._id;
    const preparedProducts = testProducts.map(product => {
      const prepared = {
        ...product,
        categories: [categoryId],
        createdBy: adminUser?._id,
        updatedBy: adminUser?._id,
      };

      // Add price history if basePrice exists
      if (prepared.pricing?.basePrice) {
        prepared.pricing.priceHistory = [{
          price: prepared.pricing.basePrice,
          date: new Date(),
          reason: 'initial'
        }];
      }

      // Update stock status for physical products
      if (prepared.type === 'physical' && prepared.inventory) {
        const quantity = prepared.inventory.quantity || 0;
        const lowStockThreshold = prepared.inventory.lowStockThreshold || 10;
        
        if (quantity === 0 && !prepared.inventory.allowBackorder) {
          prepared.inventory.stockStatus = 'out_of_stock';
        } else if (quantity > 0 && quantity <= lowStockThreshold) {
          prepared.inventory.stockStatus = 'low_stock';
        } else {
          prepared.inventory.stockStatus = 'in_stock';
        }
      }

      return prepared;
    });

    // Create products
    console.log(`\nCreating ${preparedProducts.length} test products...`);
    let created = 0;
    let skipped = 0;

    for (const productData of preparedProducts) {
      try {
        // Check if product already exists
        const existing = await Product.findOne({ 
          $or: [
            { 'sku': productData.sku },
            { 'slug.fa': productData.slug.fa }
          ]
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${productData.name.fa} (already exists)`);
          skipped++;
          continue;
        }

        const product = await Product.create(productData);
        console.log(`✅ Created: ${product.name.fa} (SKU: ${product.sku})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${productData.name.fa}:`, error.message);
        if (error.errors) {
          console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
      }
    }

    console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}, Total: ${preparedProducts.length}`);
    
    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the script
createTestProducts();

