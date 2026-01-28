/**
 * Script to verify products are complete
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';
import { ProductQuestion } from '../src/modules/productQuestions/model.js';
import { Comment } from '../src/modules/comments/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

async function verifyProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({ deletedAt: null, status: 'active' }).limit(5);

    for (const product of products) {
      const questions = await ProductQuestion.countDocuments({ product: product._id, deletedAt: null });
      const reviews = await Comment.countDocuments({ resourceType: 'Product', resourceId: product._id, deletedAt: null });

      console.log(`\n📦 ${product.name.fa}`);
      console.log(`   Featured Image: ${product.featuredImage ? '✅' : '❌'} ${product.featuredImage}`);
      console.log(`   Gallery Images: ${product.gallery?.length || 0} images`);
      console.log(`   Price History: ${product.pricing.priceHistory?.length || 0} entries`);
      console.log(`   Questions: ${questions}`);
      console.log(`   Reviews: ${reviews}`);
      console.log(`   Ratings: ${product.ratings.average}/5 (${product.ratings.count} reviews)`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyProducts();

