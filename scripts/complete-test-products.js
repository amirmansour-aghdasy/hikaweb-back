/**
 * Script to complete test products with:
 * - Images (placeholder from picsum.photos)
 * - Price history (for charts)
 * - Product questions and answers
 * - Reviews/comments
 * 
 * Run with: node back/scripts/complete-test-products.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';
import { ProductQuestion } from '../src/modules/productQuestions/model.js';
import { Comment } from '../src/modules/comments/model.js';
import { User } from '../src/modules/auth/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

// Sample questions and answers for products
const sampleQuestions = [
  {
    question: 'آیا این محصول گارانتی دارد؟',
    answers: [
      {
        answer: 'بله، این محصول دارای گارانتی 12 ماهه از تاریخ خرید است.',
        isVendorAnswer: true
      }
    ]
  },
  {
    question: 'آیا امکان بازگشت محصول وجود دارد؟',
    answers: [
      {
        answer: 'بله، در صورت عدم رضایت می‌توانید تا 7 روز پس از دریافت محصول آن را برگردانید.',
        isVendorAnswer: true
      }
    ]
  },
  {
    question: 'زمان ارسال چقدر است؟',
    answers: [
      {
        answer: 'برای محصولات فیزیکی، ارسال بین 2 تا 5 روز کاری انجام می‌شود.',
        isVendorAnswer: true
      },
      {
        answer: 'من محصول را در 3 روز دریافت کردم. خیلی سریع بود!',
        isVendorAnswer: false
      }
    ]
  },
  {
    question: 'کیفیت محصول چگونه است؟',
    answers: [
      {
        answer: 'کیفیت محصول عالی است. من از خریدم راضی هستم.',
        isVendorAnswer: false
      },
      {
        answer: 'بله، کیفیت بسیار خوب است و ارزش خرید دارد.',
        isVendorAnswer: false
      }
    ]
  },
  {
    question: 'آیا این محصول برای مبتدیان مناسب است؟',
    answers: [
      {
        answer: 'بله، این محصول برای همه سطوح مناسب است و راهنمای کامل دارد.',
        isVendorAnswer: true
      }
    ]
  }
];

// Sample reviews/comments
const sampleReviews = [
  {
    content: 'محصول عالی و با کیفیت. از خریدم کاملاً راضی هستم. توصیه می‌کنم.',
    rating: 5
  },
  {
    content: 'کیفیت خوبی دارد اما قیمت کمی بالا است. در کل راضی هستم.',
    rating: 4
  },
  {
    content: 'محصول خوبی است اما بسته‌بندی می‌توانست بهتر باشد.',
    rating: 4
  },
  {
    content: 'عالی! دقیقاً همان چیزی بود که انتظار داشتم. کیفیت عالی و قیمت مناسب.',
    rating: 5
  },
  {
    content: 'محصول خوبی است اما راهنمای استفاده کامل نیست.',
    rating: 3
  },
  {
    content: 'خیلی راضی هستم. کیفیت عالی و پشتیبانی خوب. حتماً دوباره خرید می‌کنم.',
    rating: 5
  },
  {
    content: 'محصول خوبی است اما می‌توانست بهتر باشد.',
    rating: 3
  },
  {
    content: 'عالی! از خریدم کاملاً راضی هستم. کیفیت و قیمت مناسب.',
    rating: 5
  }
];

// Generate price history (last 6 months)
function generatePriceHistory(basePrice, salePrice, compareAtPrice) {
  const history = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
  
  // Start with original price 6 months ago
  const originalPrice = compareAtPrice || basePrice * 1.3;
  history.push({
    price: originalPrice,
    date: sixMonthsAgo,
    reason: 'initial'
  });
  
  // Add price changes over time
  const months = 6;
  for (let i = 1; i < months; i++) {
    const date = new Date(sixMonthsAgo.getTime() + (i * 30 * 24 * 60 * 60 * 1000));
    let price = originalPrice;
    let reason = 'update';
    
    // Simulate price changes
    if (i === 2) {
      price = basePrice * 1.1;
      reason = 'price_adjustment';
    } else if (i === 3) {
      price = basePrice;
      reason = 'regular_price';
    } else if (i === 4 && salePrice) {
      price = salePrice;
      reason = 'sale';
    } else if (i === 5 && salePrice) {
      price = salePrice;
      reason = 'sale';
    }
    
    history.push({
      price: Math.round(price),
      date,
      reason
    });
  }
  
  // Add current price
  const currentPrice = salePrice || basePrice;
  history.push({
    price: currentPrice,
    date: now,
    reason: salePrice ? 'sale' : 'current'
  });
  
  return history;
}

// Generate random image URL from picsum.photos
function getRandomImageUrl(width = 800, height = 600, seed = null) {
  const imageId = seed || Math.floor(Math.random() * 1000);
  return `https://picsum.photos/seed/${imageId}/${width}/${height}`;
}

async function completeTestProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get admin user for questions/reviews
    let adminUser = await User.findOne({ email: 'mahdisahebelm@gmail.com' });
    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' });
    }
    if (!adminUser) {
      adminUser = await User.findOne();
    }

    // Get all test products
    const products = await Product.find({ 
      deletedAt: null,
      status: 'active'
    }).limit(50);

    if (products.length === 0) {
      console.log('❌ No products found. Please create test products first.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Found ${products.length} products to complete\n`);

    // Get some users for reviews (or create dummy users)
    let reviewUsers = await User.find().limit(10);
    if (reviewUsers.length === 0 && adminUser) {
      reviewUsers = [adminUser];
    }

    let completed = 0;
    let skipped = 0;

    for (const product of products) {
      try {
        let updated = false;
        const updates = {};

        // 1. Add/Update images
        if (!product.featuredImage || product.featuredImage.includes('/assets/products/')) {
          // Create unique seed from SKU hash
          const skuHash = product.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const imageSeed = skuHash % 1000;
          updates.featuredImage = getRandomImageUrl(800, 600, imageSeed);
          updated = true;
        }

        // Add gallery images if empty
        if (!product.gallery || product.gallery.length === 0) {
          const gallerySize = product.type === 'physical' ? 5 : 3;
          const skuHash = product.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          updates.gallery = [];
          for (let i = 0; i < gallerySize; i++) {
            const imageSeed = (skuHash + i) % 1000;
            updates.gallery.push({
              url: getRandomImageUrl(1200, 800, imageSeed),
              alt: { fa: `تصویر ${i + 1} ${product.name.fa}`, en: `Image ${i + 1} ${product.name.en}` },
              caption: { fa: `نمای ${i + 1} از محصول`, en: `View ${i + 1} of product` },
              order: i
            });
          }
          updated = true;
        }

        // 2. Add/Update price history
        if (!product.pricing.priceHistory || product.pricing.priceHistory.length < 5) {
          const priceHistory = generatePriceHistory(
            product.pricing.basePrice,
            product.pricing.salePrice,
            product.pricing.compareAtPrice
          );
          updates['pricing.priceHistory'] = priceHistory;
          updated = true;
        }

        // 3. Add product questions
        const existingQuestions = await ProductQuestion.countDocuments({ 
          product: product._id,
          deletedAt: null
        });

        if (existingQuestions === 0) {
          const questionsToAdd = sampleQuestions.slice(0, Math.floor(Math.random() * 3) + 3); // 3-5 questions
          
          for (const qData of questionsToAdd) {
            const questionUser = reviewUsers[Math.floor(Math.random() * reviewUsers.length)] || adminUser;
            if (!questionUser) continue;

            const question = await ProductQuestion.create({
              product: product._id,
              question: qData.question,
              askedBy: questionUser._id,
              answers: qData.answers.map(answerData => ({
                answer: answerData.answer,
                answeredBy: answerData.isVendorAnswer ? (adminUser?._id || questionUser._id) : questionUser._id,
                isVendorAnswer: answerData.isVendorAnswer,
                moderationStatus: 'approved',
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
              })),
              moderationStatus: 'approved',
              helpfulVotes: Math.floor(Math.random() * 10),
              createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) // Random date in last 60 days
            });
          }
          console.log(`  ✅ Added ${questionsToAdd.length} questions`);
        }

        // 4. Add reviews/comments
        const existingReviews = await Comment.countDocuments({
          resourceType: 'Product',
          resourceId: product._id,
          deletedAt: null
        });

        if (existingReviews === 0) {
          const reviewsToAdd = sampleReviews.slice(0, Math.floor(Math.random() * 4) + 4); // 4-7 reviews
          
          for (const reviewData of reviewsToAdd) {
            const reviewUser = reviewUsers[Math.floor(Math.random() * reviewUsers.length)] || adminUser;
            if (!reviewUser) continue;

            await Comment.create({
              content: reviewData.content,
              rating: reviewData.rating,
              author: reviewUser._id,
              resourceType: 'Product',
              resourceId: product._id,
              moderationStatus: 'approved',
              moderatedBy: adminUser?._id,
              moderatedAt: new Date(),
              helpfulVotes: Math.floor(Math.random() * 5),
              isVerifiedPurchase: Math.random() > 0.5, // Random verified purchase
              createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random date in last 90 days
            });
          }
          console.log(`  ✅ Added ${reviewsToAdd.length} reviews`);

          // Update product ratings based on reviews
          const allReviews = await Comment.find({
            resourceType: 'Product',
            resourceId: product._id,
            moderationStatus: 'approved',
            deletedAt: null
          });

          if (allReviews.length > 0) {
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / allReviews.length;
            const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            allReviews.forEach(r => {
              breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
            });

            updates['ratings.total'] = totalRating;
            updates['ratings.count'] = allReviews.length;
            updates['ratings.average'] = Math.round(avgRating * 10) / 10;
            updates['ratings.breakdown'] = breakdown;
            updated = true;
          }
        }

        // Apply updates if any
        if (updated) {
          await Product.findByIdAndUpdate(product._id, { $set: updates });
          console.log(`✅ Completed: ${product.name.fa}`);
          completed++;
        } else {
          console.log(`⏭️  Skipped: ${product.name.fa} (already complete)`);
          skipped++;
        }

      } catch (error) {
        console.error(`❌ Error completing ${product.name.fa}:`, error.message);
      }
    }

    console.log(`\n✅ Done! Completed: ${completed}, Skipped: ${skipped}, Total: ${products.length}`);
    
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
completeTestProducts();

