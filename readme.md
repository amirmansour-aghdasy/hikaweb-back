# هیکاوب - بکند آژانس دیجیتال مارکتینگ

پروژه بکند کامل برای آژانس دیجیتال مارکتینگ با معماری Modular Monolith

## ویژگی‌های کلیدی

- 🏗️ **معماری Modular Monolith** - ساختار مدولار و قابل نگهداری
- 🔐 **احراز هویت پیشرفته** - JWT + OAuth + SMS OTP
- 👥 **مدیریت نقش‌ها** - سیستم دسترسی‌های دقیق
- 🌍 **چندزبانه** - پشتیبانی کامل فارسی/انگلیسی
- 📁 **مدیریت فایل** - آپلود هوشمند با Arvan Drive
- 📱 **اعلان‌رسانی** - تلگرام + SMS
- 📊 **گزارش‌گیری** - لاگ سیستم و Audit
- 🛡️ **امنیت** - XSS, CSRF, Rate Limiting محافظت
- 📚 **مستندات** - Swagger خودکار

## ماژول‌های سیستم

- **احراز هویت** - ثبت‌نام/ورود/JWT/OTP
- **مدیریت کاربران** - کاربران و نقش‌ها  
- **مقالات** - سیستم وبلاگ چندزبانه
- **خدمات** - معرفی خدمات شرکت
- **نمونه کارها** - Case Study ها
- **نظرات** - سیستم نظرات و امتیازدهی
- **تیم** - معرفی اعضای تیم
- **FAQ** - سوالات متداول
- **تیکت‌ها** - سیستم پشتیبانی
- **دسته‌بندی‌ها** - سازماندهی محتوا
- **برندها** - مشتریان و پارتنرها
- **مشاوره** - درخواست مشاوره
- **رسانه** - مدیریت فایل‌ها
- **تنظیمات** - پیکربندی سایت
- **اسلایدر** - بنرهای صفحه اصلی

## نصب و راه‌اندازی

### پیش‌نیازها

```bash
- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- yarn یا npm
```

### نصب

```bash
# کلون پروژه
git clone https://github.com/hikaweb/backend.git
cd hikaweb-backend

# نصب dependencies
npm install

# کپی فایل environment
cp .env.example .env

# ویرایش تنظیمات در .env
nano .env

# راه‌اندازی دیتابیس
npm run seed

# اجرای برنامه در حالت development  
npm run dev

# اجرای برنامه در حالت production
npm start
```

### متغیرهای Environment

فایل `.env` را با اطلاعات صحیح تکمیل کنید:

```env
# اتصال دیتابیس
MONGODB_URI=mongodb://localhost:27017/hikaweb
REDIS_URL=redis://localhost:6379

# JWT 
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# SMS (کاوه‌نگار)
KAVENEGAR_API_KEY=your-api-key
KAVENEGAR_SENDER=your-sender-number

# تلگرام
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# آروان درایو
ARVAN_DRIVE_ACCESS_KEY=your-access-key
ARVAN_DRIVE_SECRET_KEY=your-secret-key
ARVAN_DRIVE_BUCKET=your-bucket-name
```

## استفاده

### اطلاعات ورود پیش‌فرض
```
ایمیل: admin@hikaweb.ir  
رمز عبور: HikawebAdmin@123
```

### لینک‌های مهم
- API Documentation: `http://localhost:3000/api-docs`
- Health Check: `http://localhost:3000/health`
- Base API: `http://localhost:3000/api/v1`

## ساختار پروژه

```
src/
├── config/          # پیکربندی‌های اصلی
├── middleware/      # میدل‌ویرهای Express
├── modules/         # ماژول‌های کسب و کار
├── utils/           # ابزارهای کمکی
├── shared/          # کدهای مشترک
└── locales/         # فایل‌های ترجمه
```

## مشارکت

1. Fork کنید
2. Branch جدید بسازید: `git checkout -b feature/amazing-feature`
3. تغییرات را commit کنید: `git commit -m 'Add amazing feature'`
4. Push کنید: `git push origin feature/amazing-feature`
5. Pull Request باز کنید

## لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

## پشتیبانی

- ایمیل: support@hikaweb.ir
- وبسایت: https://hikaweb.ir
- تلگرام: @hikaweb_support