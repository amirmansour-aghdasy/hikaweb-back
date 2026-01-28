/**
 * Script to generate full report of all products
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';
import { ProductQuestion } from '../src/modules/productQuestions/model.js';
import { Comment } from '../src/modules/comments/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

async function generateReport() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log('='.repeat(80));
    console.log('📊 گزارش کامل محصولات تستی\n');

    const products = await Product.find({ deletedAt: null, status: 'active' }).sort({ createdAt: 1 });

    let totalQuestions = 0;
    let totalReviews = 0;
    let productsWithImages = 0;
    let productsWithPriceHistory = 0;
    let productsWithQuestions = 0;
    let productsWithReviews = 0;

    for (const product of products) {
      const questions = await ProductQuestion.countDocuments({ product: product._id, deletedAt: null });
      const reviews = await Comment.countDocuments({ resourceType: 'Product', resourceId: product._id, deletedAt: null });

      totalQuestions += questions;
      totalReviews += reviews;

      if (product.featuredImage && !product.featuredImage.includes('/assets/products/')) {
        productsWithImages++;
      }
      if (product.pricing.priceHistory && product.pricing.priceHistory.length > 0) {
        productsWithPriceHistory++;
      }
      if (questions > 0) {
        productsWithQuestions++;
      }
      if (reviews > 0) {
        productsWithReviews++;
      }

      const status = {
        image: product.featuredImage && !product.featuredImage.includes('/assets/products/') ? '✅' : '❌',
        gallery: product.gallery && product.gallery.length > 0 ? `✅ (${product.gallery.length})` : '❌',
        priceHistory: product.pricing.priceHistory && product.pricing.priceHistory.length > 0 ? `✅ (${product.pricing.priceHistory.length})` : '❌',
        questions: questions > 0 ? `✅ (${questions})` : '❌',
        reviews: reviews > 0 ? `✅ (${reviews})` : '❌',
        rating: product.ratings.count > 0 ? `✅ (${product.ratings.average}/5)` : '❌'
      };

      const isComplete = status.image === '✅' && 
                        status.gallery !== '❌' && 
                        status.priceHistory !== '❌' && 
                        status.questions !== '❌' && 
                        status.reviews !== '❌';

      console.log(`${isComplete ? '✅' : '⚠️'} ${product.name.fa}`);
      console.log(`   SKU: ${product.sku} | Type: ${product.type}`);
      console.log(`   تصویر: ${status.image} | گالری: ${status.gallery} | تاریخچه قیمت: ${status.priceHistory}`);
      console.log(`   سوالات: ${status.questions} | نظرات: ${status.reviews} | امتیاز: ${status.rating}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n📈 آمار کلی:\n');
    console.log(`   تعداد کل محصولات: ${products.length}`);
    console.log(`   محصولات با تصویر: ${productsWithImages}/${products.length} (${Math.round(productsWithImages/products.length*100)}%)`);
    console.log(`   محصولات با تاریخچه قیمت: ${productsWithPriceHistory}/${products.length} (${Math.round(productsWithPriceHistory/products.length*100)}%)`);
    console.log(`   محصولات با سوالات: ${productsWithQuestions}/${products.length} (${Math.round(productsWithQuestions/products.length*100)}%)`);
    console.log(`   محصولات با نظرات: ${productsWithReviews}/${products.length} (${Math.round(productsWithReviews/products.length*100)}%)`);
    console.log(`   تعداد کل سوالات: ${totalQuestions}`);
    console.log(`   تعداد کل نظرات: ${totalReviews}`);
    console.log(`   میانگین سوالات به ازای هر محصول: ${(totalQuestions/products.length).toFixed(1)}`);
    console.log(`   میانگین نظرات به ازای هر محصول: ${(totalReviews/products.length).toFixed(1)}`);

    const completeProducts = products.filter(p => {
      const hasImage = p.featuredImage && !p.featuredImage.includes('/assets/products/');
      const hasGallery = p.gallery && p.gallery.length > 0;
      const hasPriceHistory = p.pricing.priceHistory && p.pricing.priceHistory.length > 0;
      return hasImage && hasGallery && hasPriceHistory;
    });

    console.log(`\n✅ محصولات کامل: ${completeProducts.length}/${products.length} (${Math.round(completeProducts.length/products.length*100)}%)`);
    console.log('='.repeat(80));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

generateReport();

