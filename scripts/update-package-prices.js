/**
 * One-time script: Update package prices for Content/Editing and Social Media services.
 * Run from back folder: node scripts/update-package-prices.js
 * Uses MONGODB_URI from .env
 */

import 'dotenv/config';
import { Database } from '../src/config/database.js';
import { Service } from '../src/modules/services/model.js';

const VALUE_FORMAT = (num) => `${Number(num).toLocaleString('en-US').replace(/,/g, '.')} تومان`;

const UPDATES = {
  'content-production-and-editing': {
    packages: [
      { matchValue: 15000000, newValue: 18000000, newNameFa: null },
      { matchValue: 29000000, newValue: 38000000, newNameFa: null },
      { matchValue: 24000000, newValue: 32000000, newNameFa: 'پکیج تدوین رشد' }
    ]
  },
  'social-media-management': {
    packages: [
      { matchValue: 17000000, newValue: 18000000, newNameFa: null },
      { matchValue: 28000000, newValue: 38000000, newNameFa: null },
      { matchValue: 23000000, newValue: 30000000, newNameFa: null }
    ]
  }
};

function parseValueFromDisplay(str) {
  if (!str || typeof str !== 'string') return null;
  const digits = str.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

async function updateServicePrices() {
  await Database.connect();

  for (const [slug, { packages: packageUpdates }] of Object.entries(UPDATES)) {
    const service = await Service.findOne({
      $or: [{ 'slug.fa': slug }, { 'slug.en': slug }]
    });

    if (!service || !service.pricing?.packages?.length) {
      console.warn(`Service not found or no packages: ${slug}`);
      continue;
    }

    let updated = 0;
    for (const pkg of service.pricing.packages) {
      const currentNum = parseValueFromDisplay(pkg.value);
      if (currentNum == null) continue;

      const spec = packageUpdates.find((s) => s.matchValue === currentNum);
      if (!spec) continue;

      pkg.value = VALUE_FORMAT(spec.newValue);
      if (spec.newNameFa) {
        pkg.name = pkg.name || {};
        pkg.name.fa = spec.newNameFa;
        if (!pkg.name.en) pkg.name.en = spec.newNameFa;
      }
      updated++;
    }

    await service.save();
    console.log(`Updated ${slug}: ${updated} package(s).`);
  }

  await Database.disconnect();
  console.log('Done.');
}

updateServicePrices().catch((err) => {
  console.error(err);
  process.exit(1);
});
