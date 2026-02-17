/**
 * One-time fix: Set "پکیج اقتصادی" in social-media-management to 25,000,000 تومان
 */
import 'dotenv/config';
import { Database } from '../src/config/database.js';
import { Service } from '../src/modules/services/model.js';

async function fix() {
  await Database.connect();
  const service = await Service.findOne({
    $or: [{ 'slug.fa': 'social-media-management' }, { 'slug.en': 'social-media-management' }]
  });
  if (!service?.pricing?.packages?.length) {
    console.warn('Service or packages not found');
    await Database.disconnect();
    process.exit(1);
  }
  const pkg = service.pricing.packages.find(
    (p) => p.name?.fa === 'پکیج اقتصادی' || (p.value && p.value.replace(/\D/g, '') === '18000000')
  );
  if (!pkg) {
    console.warn('Economic package not found');
    await Database.disconnect();
    process.exit(1);
  }
  pkg.value = '25.000.000 تومان';
  await service.save();
  console.log('Updated پکیج اقتصادی to 25.000.000 تومان');
  await Database.disconnect();
}

fix().catch((e) => {
  console.error(e);
  process.exit(1);
});
