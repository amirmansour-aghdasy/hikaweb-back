/**
 * Script to check product images
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

async function checkImages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({ deletedAt: null, status: 'active' });
    
    let invalidImages = 0;
    let validImages = 0;
    
    console.log('Checking product images...\n');
    
    for (const product of products) {
      if (!product.featuredImage || product.featuredImage.includes('/assets/products/')) {
        console.log(`❌ ${product.name.fa}: ${product.featuredImage || 'NO IMAGE'}`);
        invalidImages++;
      } else {
        validImages++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   ✅ Valid images: ${validImages}`);
    console.log(`   ❌ Invalid images: ${invalidImages}`);
    
    if (invalidImages > 0) {
      console.log(`\n⚠️  ${invalidImages} products need image updates!`);
    } else {
      console.log(`\n✅ All products have valid images!`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkImages();

