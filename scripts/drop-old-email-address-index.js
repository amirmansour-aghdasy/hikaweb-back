/**
 * یک بار اجرا شود (مثلاً روی سرور داخل کانتینر backend) تا ایندکس قدیمی یونیک address حذف شود.
 * بعد از آن می‌توان همان آدرس ایمیل را بعد از حذف نرم دوباره ثبت کرد.
 *
 * اجرا روی سرور: docker-compose exec backend node scripts/drop-old-email-address-index.js
 * یا از لوکال با MONGODB_URI: node scripts/drop-old-email-address-index.js
 */
import 'dotenv/config';
import { Database } from '../src/config/database.js';
import { ensureEmailAccountAddressIndex } from '../src/modules/email-accounts/model.js';

async function run() {
  try {
    await Database.connect();
    await ensureEmailAccountAddressIndex();
    await Database.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
