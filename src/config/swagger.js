import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environment.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hikaweb Backend API',
      version: '1.0.0',
      description: 'مستندات API بکند آژانس دیجیتال مارکتینگ هیکاوب',
      contact: {
        name: 'پشتیبانی هیکاوب',
        email: 'support@hikaweb.ir',
        url: 'https://hikaweb.ir'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: config.NODE_ENV === 'production' 
          ? 'https://api.hikaweb.ir' 
          : `http://localhost:${config.PORT}`,
        description: config.NODE_ENV === 'production' ? 'سرور تولید' : 'سرور توسعه'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'پیام خطا'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'عملیات موفقیت‌آمیز'
            },
            data: {
              type: 'object'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' }
          }
        },
        MultiLanguageText: {
          type: 'object',
          properties: {
            fa: { type: 'string' },
            en: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'احراز هویت و مجوزدهی کاربران' },
      { name: 'Users', description: 'مدیریت کاربران' },
      { name: 'Articles', description: 'مدیریت مقالات وبلاگ' },
      { name: 'Services', description: 'مدیریت خدمات شرکت' },
      { name: 'Portfolio', description: 'مدیریت نمونه کارها' },
      { name: 'Comments', description: 'سیستم نظرات و امتیازدهی' },
      { name: 'Team', description: 'مدیریت اعضای تیم' },
      { name: 'FAQ', description: 'سوالات متداول' },
      { name: 'Tickets', description: 'سیستم تیکت پشتیبانی' },
      { name: 'Categories', description: 'دسته‌بندی محتوا' },
      { name: 'Brands', description: 'مدیریت برندهای مشتریان' },
      { name: 'Consultations', description: 'درخواست‌های مشاوره' },
      { name: 'Media', description: 'مدیریت رسانه و فایل‌ها' },
      { name: 'Settings', description: 'تنظیمات سایت' },
      { name: 'Carousel', description: 'اسلایدرهای صفحه اصلی' }
    ]
  },
  apis: ['./src/modules/*/routes.js', './src/modules/*/controller.js']
};

export const swaggerSpec = swaggerJsdoc(options);