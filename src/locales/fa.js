export const faTranslations = {
    "auth": {
      "registerSuccess": "ثبت‌نام با موفقیت انجام شد",
      "loginSuccess": "ورود با موفقیت انجام شد", 
      "logoutSuccess": "خروج با موفقیت انجام شد",
      "tokenRequired": "توکن احراز هویت مورد نیاز است",
      "tokenInvalid": "توکن نامعتبر است",
      "tokenExpired": "توکن منقضی شده است",
      "tokenRefreshed": "توکن با موفقیت تجدید شد",
      "authenticationRequired": "احراز هویت مورد نیاز است",
      "insufficientPermissions": "دسترسی کافی ندارید",
      "accessDenied": "دسترسی رد شد",
      "userNotFound": "کاربر یافت نشد",
      "passwordChanged": "رمز عبور با موفقیت تغییر کرد",
      "otpSent": "کد تایید ارسال شد",
      "otpVerified": "کد تایید با موفقیت تأیید شد"
    },
    "validation": {
      "failed": "اعتبارسنجی ناموفق بود"
    },
    "common": {
      "internalError": "خطای داخلی سرور",
      "notFound": "یافت نشد",
      "invalidId": "شناسه نامعتبر", 
      "duplicateEntry": "رکورد تکراری",
      "routeNotFound": "مسیر یافت نشد",
      "createSuccess": "با موفقیت ایجاد شد",
      "updateSuccess": "با موفقیت به‌روزرسانی شد",
      "deleteSuccess": "با موفقیت حذف شد",
      "retrieveSuccess": "با موفقیت دریافت شد"
    },
    "media": {
      "fileRequired": "فایل مورد نیاز است",
      "uploadSuccess": "فایل با موفقیت آپلود شد",
      "updateSuccess": "اطلاعات رسانه با موفقیت به‌روزرسانی شد",
      "deleteSuccess": "فایل با موفقیت حذف شد",
      "notFound": "رسانه یافت نشد",
      "folderCreated": "پوشه با موفقیت ایجاد شد"
    },
    "users": {
      "createSuccess": "کاربر با موفقیت ایجاد شد",
      "updateSuccess": "اطلاعات کاربر به‌روزرسانی شد",
      "deleteSuccess": "کاربر با موفقیت حذف شد",
      "notFound": "کاربر یافت نشد",
      "emailExists": "این ایمیل قبلاً ثبت شده است",
      "mobileExists": "این شماره موبایل قبلاً ثبت شده است"
    },
    "articles": {
      "createSuccess": "مقاله با موفقیت ایجاد شد",
      "updateSuccess": "مقاله به‌روزرسانی شد",
      "deleteSuccess": "مقاله حذف شد",
      "publishSuccess": "مقاله منتشر شد",
      "unpublishSuccess": "انتشار مقاله لغو شد",
      "notFound": "مقاله یافت نشد",
      "slugExists": "این آدرس یکتا قبلاً استفاده شده است"
    },
    "services": {
      "createSuccess": "خدمت با موفقیت ایجاد شد",
      "updateSuccess": "خدمت به‌روزرسانی شد", 
      "deleteSuccess": "خدمت حذف شد",
      "notFound": "خدمت یافت نشد",
      "slugExists": "این آدرس یکتا قبلاً استفاده شده است"
    },
    "portfolio": {
      "createSuccess": "نمونه کار با موفقیت ایجاد شد",
      "updateSuccess": "نمونه کار به‌روزرسانی شد",
      "deleteSuccess": "نمونه کار حذف شد",
      "notFound": "نمونه کار یافت نشد"
    },
    "comments": {
      "createSuccess": "نظر با موفقیت ثبت شد",
      "updateSuccess": "نظر به‌روزرسانی شد",
      "deleteSuccess": "نظر حذف شد",
      "moderateSuccess": "نظر بررسی شد",
      "notFound": "نظر یافت نشد",
      "alreadyCommented": "شما قبلاً نظر داده‌اید"
    },
    "tickets": {
      "createSuccess": "تیکت با موفقیت ایجاد شد",
      "updateSuccess": "تیکت به‌روزرسانی شد",
      "closeSuccess": "تیکت بسته شد",
      "assignSuccess": "تیکت واگذار شد",
      "messageAdded": "پیام به تیکت اضافه شد",
      "notFound": "تیکت یافت نشد"
    },
    "consultations": {
      "submitSuccess": "درخواست مشاوره ثبت شد",
      "updateSuccess": "درخواست به‌روزرسانی شد",
      "notFound": "درخواست یافت نشد",
      "alreadyProcessed": "این درخواست قبلاً پردازش شده است"
    }
  };
  
  // Create the actual JSON file content for fa.json
  const faJsonContent = JSON.stringify(faTranslations, null, 2);