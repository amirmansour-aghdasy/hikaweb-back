/**
 * Optional: Create default email account info@hikaweb.ir from env.
 * Run: EMAIL_ADDRESS=info@hikaweb.ir EMAIL_SMTP_HOST=... EMAIL_SMTP_USER=... EMAIL_SMTP_PASSWORD=... node scripts/seed-email-account.js
 */
import mongoose from 'mongoose';
import { config } from '../src/config/environment.js';
import { EmailAccount } from '../src/modules/email-accounts/model.js';
import { encrypt } from '../src/utils/encrypt.js';

const address = process.env.EMAIL_ADDRESS || 'info@hikaweb.ir';
const smtpHost = process.env.EMAIL_SMTP_HOST;
const smtpUser = process.env.EMAIL_SMTP_USER;
const smtpPassword = process.env.EMAIL_SMTP_PASSWORD;

async function run() {
  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.log('Usage: EMAIL_ADDRESS=info@hikaweb.ir EMAIL_SMTP_HOST=mail.example.com EMAIL_SMTP_USER=info@hikaweb.ir EMAIL_SMTP_PASSWORD=xxx node scripts/seed-email-account.js');
    process.exit(1);
  }
  await mongoose.connect(config.MONGODB_URI);
  const existing = await EmailAccount.findOne({ address, deletedAt: null });
  if (existing) {
    console.log('Account already exists:', address);
    process.exit(0);
  }
  const account = new EmailAccount({
    address,
    displayName: 'هیکاوب',
    smtpHost,
    smtpPort: parseInt(process.env.EMAIL_SMTP_PORT, 10) || 587,
    smtpSecure: process.env.EMAIL_SMTP_SECURE === 'true',
    smtpUser,
    smtpPasswordEncrypted: encrypt(smtpPassword),
    isDefault: true,
  });
  await account.save();
  console.log('Created email account:', address);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
