/**
 * Script to test product questions and comments
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/model.js';
import { ProductQuestion } from '../src/modules/productQuestions/model.js';
import { Comment } from '../src/modules/comments/model.js';
import { User } from '../src/modules/auth/model.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb';

async function testProductQA() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get first product
    const product = await Product.findOne({ deletedAt: null, status: 'active' });
    
    if (!product) {
      console.log('❌ No product found');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📦 Product: ${product.name.fa}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   SKU: ${product.sku}\n`);

    // Check questions
    const questions = await ProductQuestion.find({
      product: product._id,
      deletedAt: null
    }).populate('askedBy', 'name');

    console.log(`📝 Questions:`);
    console.log(`   Total: ${questions.length}`);
    questions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question}`);
      console.log(`      Status: ${q.moderationStatus}`);
      console.log(`      Answers: ${q.answers?.length || 0}`);
      console.log(`      Approved Answers: ${q.answers?.filter(a => a.moderationStatus === 'approved').length || 0}`);
    });

    // Check approved questions
    const approvedQuestions = await ProductQuestion.find({
      product: product._id,
      moderationStatus: 'approved',
      deletedAt: null
    });

    console.log(`\n✅ Approved Questions: ${approvedQuestions.length}`);

    // Check comments
    const comments = await Comment.find({
      resourceType: 'Product',
      resourceId: product._id,
      deletedAt: null
    }).populate('author', 'name');

    console.log(`\n💬 Comments:`);
    console.log(`   Total: ${comments.length}`);
    comments.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.content.substring(0, 50)}...`);
      console.log(`      Status: ${c.moderationStatus}`);
      console.log(`      Rating: ${c.rating}`);
    });

    // Check approved comments
    const approvedComments = await Comment.find({
      resourceType: 'Product',
      resourceId: product._id,
      moderationStatus: 'approved',
      deletedAt: null
    });

    console.log(`\n✅ Approved Comments: ${approvedComments.length}`);

    // Test API endpoint structure
    console.log(`\n🔍 Testing API Response Structure:`);
    
    // Simulate getProductQuestions response
    const questionsResult = await ProductQuestion.find({
      product: product._id,
      moderationStatus: 'approved',
      deletedAt: null
    })
    .populate('askedBy', 'name avatar')
    .populate('answers.answeredBy', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    console.log(`   Questions API would return: ${questionsResult.length} questions`);
    if (questionsResult.length > 0) {
      console.log(`   First question structure:`);
      console.log(`      _id: ${questionsResult[0]._id}`);
      console.log(`      question: ${questionsResult[0].question}`);
      console.log(`      moderationStatus: ${questionsResult[0].moderationStatus}`);
      console.log(`      answers count: ${questionsResult[0].answers?.length || 0}`);
    }

    // Simulate getCommentsByReference response
    const commentsResult = await Comment.find({
      resourceType: 'Product',
      resourceId: product._id,
      moderationStatus: 'approved',
      deletedAt: null
    })
    .populate('author', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    console.log(`\n   Comments API would return: ${commentsResult.length} comments`);
    if (commentsResult.length > 0) {
      console.log(`   First comment structure:`);
      console.log(`      _id: ${commentsResult[0]._id}`);
      console.log(`      content: ${commentsResult[0].content.substring(0, 50)}...`);
      console.log(`      rating: ${commentsResult[0].rating}`);
      console.log(`      resourceType: ${commentsResult[0].resourceType}`);
      console.log(`      resourceId: ${commentsResult[0].resourceId}`);
      console.log(`      moderationStatus: ${commentsResult[0].moderationStatus}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testProductQA();

