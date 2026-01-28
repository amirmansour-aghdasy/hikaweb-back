/**
 * Script to create test videos
 * Creates 3 videos with the same video file but different covers
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:5000/api/v1';
// Use the super admin credentials from seed.js
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mahdisahebelm@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '09191393479';

// Login and get token
async function login() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            rememberMe: false
        });
        // Response structure: { success: true, data: { user: {...}, tokens: { accessToken, refreshToken } } }
        return response.data.data.tokens.accessToken;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        if (error.response?.data?.error) {
            console.error('Error details:', JSON.stringify(error.response.data.error, null, 2));
        }
        throw error;
    }
}

// Fetch media files
async function fetchMedia(token, fileType = null) {
    try {
        const params = fileType ? { fileType, limit: 100 } : { limit: 100 };
        const response = await axios.get(`${API_BASE_URL}/media`, {
            headers: { Authorization: `Bearer ${token}` },
            params
        });
        return response.data.data || [];
    } catch (error) {
        console.error('Failed to fetch media:', error.response?.data || error.message);
        throw error;
    }
}

// Create video
async function createVideo(token, videoData) {
    try {
        const response = await axios.post(`${API_BASE_URL}/videos`, videoData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to create video:', error.response?.data || error.message);
        throw error;
    }
}

// Main function
async function main() {
    try {
        console.log('🔐 Logging in...');
        const token = await login();
        console.log('✅ Logged in successfully');

        console.log('\n📹 Fetching video files...');
        const videos = await fetchMedia(token, 'video');
        if (videos.length === 0) {
            console.error('❌ No video files found in media library');
            process.exit(1);
        }
        const videoFile = videos[0];
        console.log(`✅ Found video: ${videoFile.name || videoFile.filename || videoFile._id}`);
        console.log(`   URL: ${videoFile.url}`);
        console.log(`   Duration: ${videoFile.duration || 'N/A'} seconds`);
        console.log(`   Size: ${videoFile.size ? (videoFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);

        console.log('\n🖼️  Fetching image files...');
        const images = await fetchMedia(token, 'image');
        if (images.length < 3) {
            console.error(`❌ Not enough image files found. Need at least 3, found ${images.length}`);
            process.exit(1);
        }
        console.log(`✅ Found ${images.length} images`);

        // Select 3 different images for covers
        const coverImages = images.slice(0, 3);
        console.log('\n📸 Selected cover images:');
        coverImages.forEach((img, index) => {
            console.log(`   ${index + 1}. ${img.name || img.filename || img._id} - ${img.url}`);
        });

        // Video data templates
        const videoTemplates = [
            {
                title: {
                    fa: 'ویدئو تستی شماره ۱ - آموزش طراحی وب',
                    en: 'Test Video 1 - Web Design Tutorial'
                },
                shortDescription: {
                    fa: 'این یک ویدئو تستی است که برای بررسی عملکرد سیستم ویدئو ایجاد شده است. در این ویدئو به آموزش طراحی وب می‌پردازیم.',
                    en: 'This is a test video created to check video system functionality. This video covers web design tutorials.'
                },
                description: {
                    fa: 'این ویدئو تستی شامل آموزش‌های جامع در زمینه طراحی وب است. در این ویدئو با مفاهیم پایه HTML، CSS و JavaScript آشنا می‌شوید و نحوه ساخت یک وب‌سایت مدرن را یاد می‌گیرید. این محتوا برای مبتدیان و افرادی که می‌خواهند وارد دنیای طراحی وب شوند مناسب است.',
                    en: 'This test video includes comprehensive tutorials on web design. In this video, you will learn the basics of HTML, CSS, and JavaScript and how to build a modern website. This content is suitable for beginners and those who want to enter the world of web design.'
                },
                tags: {
                    fa: ['آموزش', 'طراحی وب', 'HTML', 'CSS', 'JavaScript', 'تست'],
                    en: ['tutorial', 'web design', 'HTML', 'CSS', 'JavaScript', 'test']
                }
            },
            {
                title: {
                    fa: 'ویدئو تستی شماره ۲ - برنامه‌نویسی React',
                    en: 'Test Video 2 - React Programming'
                },
                shortDescription: {
                    fa: 'ویدئو تستی دوم که به بررسی عملکرد سیستم ویدئو می‌پردازد. این ویدئو در مورد برنامه‌نویسی با React است.',
                    en: 'Second test video that examines video system functionality. This video is about React programming.'
                },
                description: {
                    fa: 'در این ویدئو تستی به آموزش برنامه‌نویسی با React می‌پردازیم. شما با مفاهیم پایه React مانند Components، Props، State و Hooks آشنا می‌شوید. همچنین نحوه ساخت یک اپلیکیشن React ساده را یاد می‌گیرید. این محتوا برای توسعه‌دهندگان Frontend که می‌خواهند مهارت‌های خود را در React بهبود بخشند مناسب است.',
                    en: 'In this test video, we cover React programming tutorials. You will learn basic React concepts such as Components, Props, State, and Hooks. You will also learn how to build a simple React application. This content is suitable for Frontend developers who want to improve their React skills.'
                },
                tags: {
                    fa: ['React', 'برنامه‌نویسی', 'Frontend', 'JavaScript', 'تست'],
                    en: ['React', 'programming', 'Frontend', 'JavaScript', 'test']
                }
            },
            {
                title: {
                    fa: 'ویدئو تستی شماره ۳ - اصول SEO',
                    en: 'Test Video 3 - SEO Fundamentals'
                },
                shortDescription: {
                    fa: 'سومین ویدئو تستی برای بررسی عملکرد سیستم. این ویدئو در مورد اصول SEO و بهینه‌سازی موتورهای جستجو است.',
                    en: 'Third test video to check system functionality. This video is about SEO fundamentals and search engine optimization.'
                },
                description: {
                    fa: 'این ویدئو تستی به آموزش اصول SEO و بهینه‌سازی موتورهای جستجو می‌پردازد. در این ویدئو با مفاهیم مهم SEO مانند کلمات کلیدی، لینک‌سازی، بهینه‌سازی محتوا و تحلیل عملکرد سایت آشنا می‌شوید. همچنین تکنیک‌های عملی برای بهبود رتبه سایت در موتورهای جستجو را یاد می‌گیرید. این محتوا برای صاحبان وب‌سایت و بازاریابان دیجیتال مفید است.',
                    en: 'This test video covers SEO fundamentals and search engine optimization. In this video, you will learn important SEO concepts such as keywords, link building, content optimization, and website performance analysis. You will also learn practical techniques to improve your site\'s search engine ranking. This content is useful for website owners and digital marketers.'
                },
                tags: {
                    fa: ['SEO', 'بهینه‌سازی', 'موتور جستجو', 'بازاریابی', 'تست'],
                    en: ['SEO', 'optimization', 'search engine', 'marketing', 'test']
                }
            }
        ];

        console.log('\n🎬 Creating test videos...\n');

        for (let i = 0; i < 3; i++) {
            const template = videoTemplates[i];
            const coverImage = coverImages[i];

            const videoData = {
                title: template.title,
                shortDescription: template.shortDescription,
                description: template.description,
                videoUrl: videoFile.url,
                thumbnailUrl: coverImage.url,
                duration: videoFile.duration || 120, // Default 2 minutes if not available
                fileSize: videoFile.size || 0,
                quality: videoFile.dimensions?.height >= 1080 ? '1080p' : 
                        videoFile.dimensions?.height >= 720 ? '720p' : 'auto',
                format: videoFile.mimeType?.includes('mp4') ? 'mp4' : 
                       videoFile.mimeType?.includes('webm') ? 'webm' : 'mp4',
                tags: template.tags,
                isPublished: true,
                isFeatured: i === 0, // Make first video featured
                metadata: videoFile.dimensions ? {
                    width: videoFile.dimensions.width || 0,
                    height: videoFile.dimensions.height || 0,
                } : undefined
            };

            console.log(`📹 Creating video ${i + 1}/3: ${template.title.fa}`);
            const result = await createVideo(token, videoData);
            
            if (result.success) {
                const video = result.data?.video || result.data;
                console.log(`   ✅ Created successfully!`);
                console.log(`   📍 ID: ${video?._id || video?.id || 'N/A'}`);
                console.log(`   🔗 Slug FA: ${video?.slug?.fa || 'N/A'}`);
                console.log(`   🔗 Slug EN: ${video?.slug?.en || 'N/A'}`);
            } else {
                console.log(`   ❌ Failed: ${result.message || 'Unknown error'}`);
            }
            console.log('');
        }

        console.log('✅ All test videos created successfully!');
        console.log('\n📝 Summary:');
        console.log(`   - Video file used: ${videoFile.name || videoFile.filename || videoFile._id}`);
        console.log(`   - Cover images used: ${coverImages.length} different images`);
        console.log(`   - Videos created: 3`);
        console.log(`   - All videos are published and ready for frontend testing`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the script
main();

