#!/usr/bin/env node

/**
 * Seed script for testimonials and FAQs
 * This script directly inserts data into MongoDB
 * Usage: node scripts/seed-testimonials-faqs.js
 */

import mongoose from 'mongoose';
import { config } from '../src/config/environment.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Testimonials data - using existing comments structure
const testimonialsData = [
  {
    writer: 'مریم کاشانی',
    position: 'مدیر برند کیوتی کیدز',
    text: 'سلام من مریم کاشانی هستم که برندم یعنی کیوتی کیدز رو از سال 1401 با هیکاوب استارت زدم و این تیم به کسب و کار من دلسوزانه کمک میکرد و باعث شد کسب و کار من در زمینه های بسیاری هم در اینستاگرام هم در بسته بندی و فرایند فروش پیشرفت کنه',
    thumbnail: null
  },
  {
    writer: 'محسن محبی',
    position: 'مدیر برند باردوبایک',
    text: 'من سالهای زیادیه که در زمین فروش و تولید دوچرخه فعالیت دارم و برند باردوبایک رو با تیم هیکاوب از همون اول استارتشو زدم از طراحی لوگو و رنگ سازمانی تا تولید محتوا و اینستاگرام و تبلیغات نمایشگاه وامور چاپ کسب و کارم و راضی بودم از این تیم',
    thumbnail: null
  },
  {
    writer: 'ندا کارآزموده',
    position: 'مدیر کلینیک ونوس',
    text: 'هیکاوب در تولید محتوا و مدیریت اینستاگرام و چاپ تراکت به ما خیلی کمک کرد و مهمترین چیز تعهد کاریه این تیم هستش که توی یک سال همکاری بنده دیدم اینو مرسی از شما',
    thumbnail: null
  },
  {
    writer: 'مهدی رسولی',
    position: 'مدیر برند کیف فرند',
    text: 'هیکاوب در فضای مجازی به بنده کمک کرد و بگ های بسته بندی منو طراحی و چاپ کرد و به مشهد ارسال کرد و میتونم بگم حرفشون با عملشون یکیه و وعده بعیدی در کار نیست و کارشونو به درستی انجام میدن',
    thumbnail: null
  },
  {
    writer: 'سعید احمدی',
    position: 'مدیر برند آرتمیس ویزا',
    text: 'من با این تیم در زمینه چاپ و تبلیغات محیطی همکاری داشتم و میتونم بگم در این زمینه به حد بسیار مقبولی خوش قول و متعهد هستن و شما امور چاپتون رو میتونید با خیال راحت به هیکاوب بسپارید',
    thumbnail: null
  }
];

// FAQs data organized by service slug
const faqsData = {
  'hika-studio': [
    {
      question: {
        fa: 'تولید محتوای محصول چقدر زمان بر است؟',
        en: 'How long does product content production take?'
      },
      answer: {
        fa: 'باید گفت این مورد بستگی به انتخاب شما و نیازتان دارد. در صورتی که میخواهید تولید محتوای محصول شما سریع تر انجام شود بهتر است پیش از ثبت سفارش با پشتیبانی هیکاوب در ارتباط باشید و این موضوع را با ما در میان بگذارید.',
        en: 'This depends on your choice and needs. If you want faster product content production, it is better to contact Hikaweb support before placing an order and discuss this with us.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'آیا میتوانم بر اساس نیازم پکیج اختصاصی داشته باشم؟',
        en: 'Can I have a custom package based on my needs?'
      },
      answer: {
        fa: 'بله، شما می‌توانید با مشاوران ما تماس بگیرید و پکیج اختصاصی خود را دریافت کنید.',
        en: 'Yes, you can contact our consultants and get your custom package.'
      },
      orderIndex: 2,
      isPopular: false
    }
  ],
  'graphic-design': [
    {
      question: {
        fa: 'شیوه ثبت سفارش چگونه است؟',
        en: 'How is the order registration process?'
      },
      answer: {
        fa: 'پس از دریافت مشاوره و مطمئن شدن از خدمات مورد نیاز کسب و کارتان در حوزه گرافیک و دیدن نمونه کارهای هیکاوب، شما با پرداخت پیش پرداخت سفارشتان را ثبت میکنید.',
        en: 'After receiving consultation and making sure of the services needed for your business in the field of graphics and seeing Hikaweb\'s portfolio, you register your order by paying a deposit.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'از چه ابزار هایی استفاده میکنید؟',
        en: 'What tools do you use?'
      },
      answer: {
        fa: 'ما برای طراحی کاراکتر و امور گرافیکی وکتور و برداری از ایلوستریتور و از فتوشاپ در امور دیگر مثل طراحی کاور پست اینستاگرام یا بنر وب استفاده میشود. همچنین از ادوب ایندیزاین جهت طراحی گرافیک امور چاپ استفاده میگردد.',
        en: 'We use Illustrator for character design and vector graphics, Photoshop for other tasks such as Instagram post cover design or web banners. We also use Adobe InDesign for print graphics design.'
      },
      orderIndex: 2,
      isPopular: true
    }
  ],
  'printing': [
    {
      question: {
        fa: 'تعرفه چاپ و طراحی به چه صورت است؟',
        en: 'What is the pricing for printing and design?'
      },
      answer: {
        fa: 'هزینه طراحی و چاپ جدا میباشد، چون این دو فرایند کاملا جدا از هم هستند. بعد از پرداخت پیش واریزی فرایند طراحی شما شروع میشود که حدودا دو الی سه روز کاری زمان میبرد تا طرح تکمیل شود و پس از تکمیل طرح ما به سراغ چاپ میرویم که با توجه به نوسانات قیمت کاغذ قیمت در همان روز کاری به شما داده میشود.',
        en: 'Design and printing costs are separate, as these two processes are completely separate. After paying the deposit, your design process begins, which takes approximately two to three business days to complete, and after the design is completed, we proceed to printing, and the price is given to you on the same business day according to paper price fluctuations.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'آیا میتوانم صرفا طراحی رو به هیکاوب بسپارم؟',
        en: 'Can I only entrust the design to Hikaweb?'
      },
      answer: {
        fa: 'باید بگوییم بله! شما میتوانید صرفا فرایند طراحی را به هیکاوب بسپارید و پس از تکمیل طرح‌ها فایل‌های استاندارد پروژه را به صورت آماده دریافت بفرماید.',
        en: 'Yes! You can only entrust the design process to Hikaweb and receive the standard project files ready after the designs are completed.'
      },
      orderIndex: 2,
      isPopular: false
    }
  ],
  'social-media-management': [
    {
      question: {
        fa: 'اولویت کار روی کدوم پلتفرمه؟',
        en: 'Which platform has priority?'
      },
      answer: {
        fa: 'باید گفت اگر بودجه محدودی دارید یا خود شما میخواهید کار روی سوشال مدیا را استارت بزنید باید از اینستاگرام استارت بزنید. مهم‌ترین پلتفرم سوشال مدیا در زمینه بازاریابی اینستاگرامه و بعد از اون هم سراغ تلگرام بروید، این دو اولویت بالایی دارند.',
        en: 'If you have a limited budget or want to start social media work yourself, you should start with Instagram. Instagram is the most important social media platform in marketing, and then Telegram, these two have high priority.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'شرایط پرداخت به چه صورته؟',
        en: 'What are the payment terms?'
      },
      answer: {
        fa: 'تمامی پکیج‌های هیکاوب 1 ماهه هستند، نیمی از مبلغ طبق توافق ما و شما به عنوان پیش پرداخت برای استارت کار پرداخت میشه و نیمی دیگر در شروع نیمه دوم ماه. البته هیکاوب برای تضمین کار خود و دلگرمی به شما، در شروع نیمه دوم ماه اگر از کیفیت کار راضی نبودید نیمی از پیش پرداخت را به شما بازمیگرداند.',
        en: 'All Hikaweb packages are monthly, half of the amount according to our agreement is paid as a deposit to start the work, and the other half at the beginning of the second half of the month. Of course, Hikaweb, to guarantee its work and encourage you, if you are not satisfied with the quality of work at the beginning of the second half of the month, will return half of the deposit to you.'
      },
      orderIndex: 2,
      isPopular: true
    },
    {
      question: {
        fa: 'ایا تضمینی جذب مشتری دارم؟',
        en: 'Do I have a guarantee of customer acquisition?'
      },
      answer: {
        fa: 'باید بگوییم جذب مشتری به عوامل مختلفی از جمله نوع و کیفیت محصولات شما وابسته است، پس در نتیجه جذب و تعداد مشتریان تضمینی و قابل پیش بینی نیست! اما هیکاوب کیفیت کار خود را تضمین میکند و پیشرفت شما نیز تضمین است.',
        en: 'Customer acquisition depends on various factors including the type and quality of your products, so customer acquisition and number of customers is not guaranteed and predictable! But Hikaweb guarantees the quality of its work and your progress is also guaranteed.'
      },
      orderIndex: 3,
      isPopular: false
    }
  ],
  'content-production-and-editing': [
    {
      question: {
        fa: 'به صورت پروژه همکاری دارید یا ماهانه؟',
        en: 'Do you work on a project basis or monthly?'
      },
      answer: {
        fa: 'هم به صورت پروژه‌ای هم به صورت ماهانه هیکاوب میتواند با شما همکاری کند. بستگی به نیاز کسب و کار شما در تولید محتوا و تدوین دارد. پیش از شروع بهتر است با ما در ارتباط باشید و مشاوره‌ای استاندارد دریافت نمایید تا انتخابی درست داشته باشید.',
        en: 'Hikaweb can work with you both on a project basis and monthly. It depends on your business needs in content production and editing. Before starting, it is better to contact us and receive standard consultation to make the right choice.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'تولید محتوا با دوربین فیلمبرداری است یا موبایل؟',
        en: 'Is content production done with a video camera or mobile?'
      },
      answer: {
        fa: 'به دلیل کیفیت بالای دوربین تلفن‌های هوشمند و صرفه‌جویی در هزینه اکثر کسب و کارها تمایل به فیلم‌برداری با موبایل‌های نسل جدید هستند، اما شما میتوانید درخواست تولید محتوا با دوربین فیلم‌برداری و یا با دوربین موبایل‌های نسل جدید را داشته باشید.',
        en: 'Due to the high quality of smartphone cameras and cost savings, most businesses prefer to film with new generation mobile phones, but you can request content production with a video camera or with new generation mobile phone cameras.'
      },
      orderIndex: 2,
      isPopular: true
    },
    {
      question: {
        fa: 'تولید محتوا و تدوین حرفه‌ای چه تاثیری دارد؟',
        en: 'What is the impact of professional content production and editing?'
      },
      answer: {
        fa: 'در مرتبه اول میتوان گفت شما کلاس برند و کیفیت محصول و خدمات خود را با بالاترین کیفیت نشان میدهید و در مرتبه دوم میتوان به تاثیر بسیار بالای ویدیویی حرفه‌ای بر تمایل مشتری و مخاطب برای خرید از شما اشاره کرد.',
        en: 'First, you show the class of your brand and the quality of your products and services with the highest quality, and second, we can mention the very high impact of professional video on customer and audience desire to buy from you.'
      },
      orderIndex: 3,
      isPopular: false
    },
    {
      question: {
        fa: 'تدوین با پریمیر انجام میشود یا نرم افزار موبایل؟',
        en: 'Is editing done with Premiere or mobile software?'
      },
      answer: {
        fa: 'این مورد نیز بستگی به نوع نیاز شما و کسب و کارتان دارد و مقدار هزینه‌ای که میخواهید انجام بدهید. در مشاوره با ما تمامی نیازها شناسایی و بهترین انتخاب به شما پیشنهاد میشود.',
        en: 'This also depends on your type of need and your business and the amount of cost you want to spend. In consultation with us, all needs are identified and the best choice is suggested to you.'
      },
      orderIndex: 4,
      isPopular: false
    }
  ],
  'logo-design': [
    {
      question: {
        fa: 'فرایند طراحی لوگوی من چقدر زمان میبره؟',
        en: 'How long does my logo design process take?'
      },
      answer: {
        fa: 'طراحی اتود اول دو الی سه روز زمان بر هستش و در صورت تایید شما فایل‌ها ارسال میگردد و اگر رضایت نداشتید ما به سراغ اتود دوم طبق سلیقه شما میرویم و تحویل اتود دوم نیز دو الی سه روز زمان میبرد، پس در نتیجه پروسه طراحی لوگوی شما از حداقل دو و حداکثر شش روز زمان میبرد.',
        en: 'The first draft design takes two to three days, and if you approve, the files are sent, and if you are not satisfied, we proceed to the second draft according to your taste, and the delivery of the second draft also takes two to three days, so the logo design process takes a minimum of two and a maximum of six days.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'تست سلیقه شناسی چه کاری انجام میدهد؟',
        en: 'What does the taste test do?'
      },
      answer: {
        fa: 'تست سلیقه شناسی هیکاوب یک آزمون خیلی خلاصه و کاربردی هستش که ما بر اساس این آزمون به سلیقه شما نزدیک تر میشویم و در نتیجه لوگوی شما نیز به سلیقه تان نزدیک میشود.',
        en: 'Hikaweb\'s taste test is a very concise and practical test that helps us get closer to your taste based on this test, and as a result, your logo also gets closer to your taste.'
      },
      orderIndex: 2,
      isPopular: false
    },
    {
      question: {
        fa: 'هزینه به صورت پرداخت میشود؟',
        en: 'How is the payment made?'
      },
      answer: {
        fa: 'نیمی از مبلغ به عنوان پیش پرداخت و ثبت سفارش طراحی لوگو شما دریافت میگردد و باقی مانده پس از تایید و رضایت شما و قبل از ارسال فایل‌های لوگو تصفیه میگردد.',
        en: 'Half of the amount is received as a deposit and registration of your logo design order, and the remainder is settled after your approval and satisfaction and before sending the logo files.'
      },
      orderIndex: 3,
      isPopular: true
    },
    {
      question: {
        fa: 'از چه ابزاری استفاده میشود؟',
        en: 'What tool is used?'
      },
      answer: {
        fa: 'ابزار استاندارد طراحی لوگو در دنیا چیزی نیست جز ایلوستریتور! ما نیز از همین برنامه استاندارد برای طراحی لوگوی شما استفاده میکنیم!',
        en: 'The standard logo design tool in the world is nothing but Illustrator! We also use this standard program to design your logo!'
      },
      orderIndex: 4,
      isPopular: false
    },
    {
      question: {
        fa: 'همه ی فرمت ها به ما تحویل داده میشه؟',
        en: 'Are all formats delivered to us?'
      },
      answer: {
        fa: 'تمامی فرمت‌ها از جمله فرمت اصلی فایل ایلوستریتور (وکتور) و فرمت PDF، فرمت PSD، فرمت PNG (جهت استفاده واترمارک)، فرمت JPEG به همراه دو عدد موکاپ رایگان برای پروفایل شما برای شما ارسال میگردد.',
        en: 'All formats including the original Illustrator file format (vector) and PDF format, PSD format, PNG format (for watermark use), JPEG format along with two free mockups for your profile are sent to you.'
      },
      orderIndex: 5,
      isPopular: true
    }
  ],
  'web-design': [
    {
      question: {
        fa: 'آیا میتوانم سایت کد نویسی اختصاصی سفارش بدم؟',
        en: 'Can I order a custom coded website?'
      },
      answer: {
        fa: 'بله چرا که نه! هیکاوب با تیمی متشکل از برنامه‌نویس‌های حرفه‌ای فول استک آماده خدمت‌رسانی به شما و کسب و کارتان است. البته پیش از ثبت سفارش بهتر است مشاوره رایگان با مدیر وب ما داشته باشید تا انتخابی درست بر اساس نیازتان داشته باشید.',
        en: 'Yes, why not! Hikaweb with a team of professional full-stack developers is ready to serve you and your business. Of course, before placing an order, it is better to have a free consultation with our web manager to make the right choice based on your needs.'
      },
      orderIndex: 1,
      isPopular: true
    },
    {
      question: {
        fa: 'آیا شما اپلیکیشن هم طراحی میکنید؟',
        en: 'Do you also design applications?'
      },
      answer: {
        fa: 'بله همانطور که در پاسخ سوال بالا گفته شد، تیم هیکاوب از برنامه‌نویسانی خبره و کاربلند با سابقه چندین ساله در حوزه وب تشکیل شده است. در نتیجه دریافت مشاوره خوب میتونه بهترین انتخاب رو در حوزه وب و اپلیکیشن برای شما و کسب و کارتان به ارمغان بیاره.',
        en: 'Yes, as mentioned in the answer to the above question, Hikaweb\'s team consists of experienced and skilled programmers with several years of experience in the web field. As a result, getting good consultation can bring the best choice in the field of web and application for you and your business.'
      },
      orderIndex: 2,
      isPopular: true
    },
    {
      question: {
        fa: 'طراحی سایت چقدر زمان بر است؟',
        en: 'How long does website design take?'
      },
      answer: {
        fa: 'بستگی به نیاز شما و انتخاب شما در حوزه وب دارد. سایت‌های طراحی شده با وردپرس نسبتا زمان کمتری نسبت به سایت‌های کد نویسی شده میبرند. اما باز برای دریافت مشاوره دقیق با مشاورین ما در حوزه وب در ارتباط باشید.',
        en: 'It depends on your needs and your choice in the web field. WordPress-designed sites take relatively less time than coded sites. But again, contact our web consultants for accurate consultation.'
      },
      orderIndex: 3,
      isPopular: false
    }
  ],
  'seo-and-optimization': [
    {
      question: {
        fa: 'آیا هر یک از مراحل سئو را جداگونه انجام میدهید؟',
        en: 'Do you perform each SEO stage separately?'
      },
      answer: {
        fa: 'بله، ممکن است شما نیاز به یکی از مراحل سئو مثل تولید محتوای حرفه‌ای بر اساس اصول سئو داشته باشید و ما با بالاترین و استانداردترین کیفیت ممکن در کنار شما و کسب و کارتان هستیم.',
        en: 'Yes, you may need one of the SEO stages such as professional content production based on SEO principles, and we are with you and your business with the highest and most standard quality possible.'
      },
      orderIndex: 1,
      isPopular: false
    },
    {
      question: {
        fa: 'نتیجه گیری از سئو چقدر زمان میبرد؟!',
        en: 'How long does it take to see SEO results?'
      },
      answer: {
        fa: 'باید گفت متاسفانه زمان قطعی نتیجه‌گیری از سئو سایت قابل تضمین و ارائه نیست! زیرا فرایند سئو طولانی و نیازمند صبر است و رقبای بسیاری نیز در حال فعالیت هستند، اما کیفیت کار و پیشرفت را به شما تضمین میدهیم.',
        en: 'Unfortunately, the exact time to see SEO results cannot be guaranteed! Because the SEO process is long and requires patience, and many competitors are also active, but we guarantee the quality of work and progress.'
      },
      orderIndex: 2,
      isPopular: true
    },
    {
      question: {
        fa: 'آیا سئو هزینه گزافی دارد؟',
        en: 'Is SEO expensive?'
      },
      answer: {
        fa: 'باید بگوییم اگر سئو را یک فرایند در نظر بگیریم و در سه مرحله سئو تکنیکال و سئو خارجی و سئو داخلی بدانیم، بله! سئو نسبت به دیگر فرایندهای مارکتینگ و تبلیغاتی شما هزینه بالاتری دارد اما میتوان این هزینه را با یک پلن مناسب به حداقل رساند.',
        en: 'If we consider SEO as a process and know it in three stages: technical SEO, external SEO, and internal SEO, yes! SEO has a higher cost than other marketing and advertising processes, but this cost can be minimized with a suitable plan.'
      },
      orderIndex: 3,
      isPopular: true
    }
  ]
};

async function seedTestimonials() {
  const db = mongoose.connection.db;
  const collection = db.collection('testimonials');
  
  console.log('📝 Seeding testimonials...');
  
  let inserted = 0;
  let skipped = 0;

  for (const testimonial of testimonialsData) {
    try {
      // Check if already exists
      const existing = await collection.findOne({
        writer: testimonial.writer,
        text: testimonial.text
      });

      if (existing) {
        console.log(`⏭️  Skipping existing: ${testimonial.writer}`);
        skipped++;
        continue;
      }

      await collection.insertOne({
        ...testimonial,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      });

      inserted++;
      console.log(`✅ Inserted: ${testimonial.writer}`);
    } catch (error) {
      console.error(`❌ Error inserting ${testimonial.writer}:`, error.message);
    }
  }

  console.log(`✅ Testimonials: ${inserted} inserted, ${skipped} skipped\n`);
  return { inserted, skipped };
}

async function seedFAQs() {
  const db = mongoose.connection.db;
  const FAQ = mongoose.connection.collection('faqs');
  const Service = mongoose.connection.collection('services');
  
  console.log('📝 Seeding FAQs...');
  
  let inserted = 0;
  let skipped = 0;

  for (const [serviceSlug, faqs] of Object.entries(faqsData)) {
    try {
      // Find service by slug
      const service = await Service.findOne({
        $or: [
          { 'slug.fa': serviceSlug },
          { 'slug.en': serviceSlug }
        ]
      });

      if (!service) {
        console.log(`⚠️  Service not found: ${serviceSlug}, skipping FAQs`);
        continue;
      }

      console.log(`📋 Processing FAQs for: ${service.name?.fa || service.name} (${serviceSlug})`);

      for (const faqData of faqs) {
        try {
          // Check if FAQ already exists
          const existing = await FAQ.findOne({
            service: service._id,
            'question.fa': faqData.question.fa
          });

          if (existing) {
            console.log(`⏭️  Skipping existing FAQ: ${faqData.question.fa.substring(0, 50)}...`);
            skipped++;
            continue;
          }

          await FAQ.insertOne({
            ...faqData,
            service: service._id,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            status: 'active',
            isPublic: true,
            views: 0,
            helpfulVotes: {
              positive: 0,
              negative: 0
            }
          });

          inserted++;
          console.log(`✅ Inserted FAQ: ${faqData.question.fa.substring(0, 50)}...`);
        } catch (error) {
          console.error(`❌ Error inserting FAQ:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing service ${serviceSlug}:`, error.message);
    }
  }

  console.log(`✅ FAQs: ${inserted} inserted, ${skipped} skipped\n`);
  return { inserted, skipped };
}

async function main() {
  try {
    await connectDB();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting seed process...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Seed testimonials
    const testimonialsResult = await seedTestimonials();

    // Seed FAQs
    const faqsResult = await seedFAQs();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Seed Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Testimonials: ${testimonialsResult.inserted} inserted, ${testimonialsResult.skipped} skipped`);
    console.log(`FAQs: ${faqsResult.inserted} inserted, ${faqsResult.skipped} skipped`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

