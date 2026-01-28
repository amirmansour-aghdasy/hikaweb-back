/**
 * Script to update product images with unique seeds
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

function getRandomImageUrl(width = 800, height = 600, seed = null) {
  const imageId = seed || Math.floor(Math.random() * 1000);
  return `https://picsum.photos/seed/${imageId}/${width}/${height}`;
}

async function updateProductImages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({ deletedAt: null, status: 'active' });

    console.log(`Found ${products.length} products to update\n`);

    let updated = 0;

    for (const product of products) {
      try {
        // Create unique seed from SKU hash
        const skuHash = product.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseSeed = skuHash % 1000;

        const updates = {
          featuredImage: getRandomImageUrl(800, 600, baseSeed)
        };

        // Update gallery images
        const gallerySize = product.type === 'physical' ? 5 : 3;
        updates.gallery = [];
        for (let i = 0; i < gallerySize; i++) {
          const imageSeed = (baseSeed + i * 100) % 1000;
          updates.gallery.push({
            url: getRandomImageUrl(1200, 800, imageSeed),
            alt: { fa: `تصویر ${i + 1} ${product.name.fa}`, en: `Image ${i + 1} ${product.name.en}` },
            caption: { fa: `نمای ${i + 1} از محصول`, en: `View ${i + 1} of product` },
            order: i
          });
        }

        await Product.findByIdAndUpdate(product._id, { $set: updates });
        console.log(`✅ Updated images for: ${product.name.fa}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${product.name.fa}:`, error.message);
      }
    }

    console.log(`\n✅ Done! Updated ${updated} products`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateProductImages();

