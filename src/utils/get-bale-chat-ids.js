const BOT_TOKEN = '1722879998:R6vZeQFAsTpgSOyPKhNByGRH5AjUlXYk2GdiSRbu'; // توکن ربات بله را اینجا قرار دهید

async function getBaleChat() {
  try {
    // دریافت آپدیت های اخیر از بله
    const response = await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/getUpdates`);
    const data = await response.json();

    if (!data.ok) {
      console.error('❌ خطا در دریافت آپدیت ها:', data.description);
      return;
    }

    console.log('📨 آپدیت های اخیر بله:');
    console.log('========================');

    if (data.result.length === 0) {
      console.log('⚠️  هیچ پیامی یافت نشد.');
      console.log('💡 ابتدا به ربات بله پیام دهید، سپس این اسکریپت را اجرا کنید.');
      return;
    }

    const chatIds = new Set();

    data.result.forEach((update, index) => {
      if (update.message) {
        const chat = update.message.chat;
        const from = update.message.from;

        console.log(`\n📍 پیام ${index + 1}:`);
        console.log(
          `   👤 فرستنده: ${from.first_name} ${from.last_name || ''} (@${from.username || 'بدون نام کاربری'})`
        );
        console.log(`   💬 Chat ID: ${chat.id}`);
        console.log(`   📝 متن پیام: "${update.message.text}"`);
        console.log(`   🕐 تاریخ: ${new Date(update.message.date * 1000).toLocaleString('fa-IR')}`);

        chatIds.add(chat.id);
      }
    });

    console.log('\n🎯 خلاصه Chat ID ها:');
    console.log('===================');
    const uniqueChatIds = Array.from(chatIds);
    uniqueChatIds.forEach((id, index) => {
      console.log(`${index + 1}. ${id}`);
    });

    console.log('\n📋 برای استفاده در .env:');
    console.log(`BALE_BOT_TOKEN=${BOT_TOKEN}`);
    console.log(`BALE_ADMIN_CHAT_IDS=${uniqueChatIds.join(',')}`);

    // تست ارسال پیام
    console.log('\n🧪 تست ارسال پیام به بله...');
    for (const chatId of uniqueChatIds) {
      await testSendBaleMessage(chatId);
    }
  } catch (error) {
    console.error('❌ خطا:', error.message);
  }
}

async function testSendBaleMessage(chatId) {
  try {
    const message = `🧪 تست ربات هیکاوب در بله
        
✅ ربات با موفقیت راه‌اندازی شد!
🔧 Chat ID شما: ${chatId}
🕐 زمان: ${new Date().toLocaleString('fa-IR')}

🔗 پلتفرم: بله (Bale Messenger)`;

    const response = await fetch(`https://tapi.bale.ai/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log(`   ✅ پیام تست به ${chatId} ارسال شد`);
    } else {
      console.log(`   ❌ خطا در ارسال به ${chatId}: ${result.description}`);
    }
  } catch (error) {
    console.log(`   ❌ خطا در ارسال به ${chatId}: ${error.message}`);
  }
}

// اجرای اسکریپت
console.log('🚀 شروع یافتن Chat ID ها در بله...');
console.log('📌 مطمئن شوید که ابتدا به ربات بله پیام داده‌اید!\n');

getBaleChat();
