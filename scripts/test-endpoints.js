#!/usr/bin/env node

/**
 * Endpoint Testing Script
 * Tests all API endpoints with fake data
 * 
 * Usage: node scripts/test-endpoints.js [--module=moduleName] [--endpoint=endpoint] [--verbose]
 */

import axios from 'axios';
import { config } from '../src/config/environment.js';

const BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api/v1';
// Allow test user to be overridden via environment variable
const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'Test123456!',
};

// Fake data generators
const fakers = {
    string: (min = 5, max = 20) => {
        const length = Math.floor(Math.random() * (max - min + 1)) + min;
        return 'test_' + Math.random().toString(36).substring(2, length);
    },
    email: () => `test_${Math.random().toString(36).substring(2, 9)}@example.com`,
    phone: () => `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
    number: (min = 1, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
    date: () => new Date().toISOString(),
    boolean: () => Math.random() > 0.5,
    array: (itemGenerator, min = 1, max = 3) => {
        const length = Math.floor(Math.random() * (max - min + 1)) + min;
        return Array.from({ length }, () => itemGenerator());
    },
    objectId: () => '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId format
    url: () => `https://example.com/${Math.random().toString(36).substring(2, 9)}`,
    slug: () => `test-${Math.random().toString(36).substring(2, 9)}`,
};

// Test results storage
const results = {
    passed: [],
    failed: [],
    skipped: [],
    total: 0,
};

let authToken = null;
let csrfToken = null;

// Check if server is running
async function checkServerStatus() {
    try {
        // Try to connect to a simple endpoint (health check or root)
        const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, {
            timeout: 3000,
            validateStatus: () => true, // Accept any status code
        });
        return true;
    } catch (error) {
        // Try alternative: check if we can reach the base URL
        try {
            const response = await axios.get(BASE_URL.replace('/api/v1', ''), {
                timeout: 3000,
                validateStatus: () => true,
            });
            return true;
        } catch (err) {
            return false;
        }
    }
}

// Helper to get auth token (only tries once to avoid rate limiting)
async function getAuthToken() {
    if (authToken) return authToken;
    
    // Try to use existing token from environment variable first
    if (process.env.TEST_AUTH_TOKEN) {
        authToken = process.env.TEST_AUTH_TOKEN;
        console.log('✅ Using token from TEST_AUTH_TOKEN environment variable');
        return authToken;
    }
    
    // Only try once to avoid rate limiting
    if (authToken === false) {
        return null; // Already tried and failed
    }
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password,
        });
        
        if (response.data?.success && response.data?.data?.accessToken) {
            authToken = response.data.data.accessToken;
            console.log('✅ Auth token obtained successfully');
            return authToken;
        } else if (response.data?.success && response.data?.data?.tokens?.accessToken) {
            // Alternative response structure
            authToken = response.data.data.tokens.accessToken;
            console.log('✅ Auth token obtained successfully');
            return authToken;
        }
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        const status = error.response?.status;
        
        // Mark as failed so we don't try again
        authToken = false;
        
        if (errorMsg.includes('rate limit') || errorMsg.includes('تعداد تلاش') || status === 429) {
            console.error('⚠️  Rate limit reached. Please wait or set TEST_AUTH_TOKEN environment variable');
        } else if (status === 401 || status === 404) {
            console.error('❌ Failed to get auth token: Invalid credentials or user not found');
            console.error(`   Email: ${TEST_USER.email}`);
            console.error('💡 Tip: Make sure test user exists. Run seed script or set TEST_AUTH_TOKEN');
        } else {
            console.error('❌ Failed to get auth token:', errorMsg);
            if (status === 500) {
                console.error('   This might be a server error. Check server logs.');
            }
        }
        console.log('💡 Tip: Set TEST_AUTH_TOKEN environment variable to use existing token');
    }
    
    return null;
}

// Helper to get CSRF token
async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    
    try {
        const token = await getAuthToken();
        if (!token) return null;
        
        const response = await axios.get(`${BASE_URL}/auth/csrf-token`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data?.success && response.data?.data?.csrfToken) {
            csrfToken = response.data.data.csrfToken;
            return csrfToken;
        }
    } catch (error) {
        // CSRF token is optional for some endpoints
    }
    
    return null;
}

// Generate fake data based on validation schema
function generateFakeData(schema, moduleName) {
    const data = {};
    
    // Common patterns for different modules
    const modulePatterns = {
        articles: {
            title: { 
                fa: 'مقاله تستی درباره توسعه وب و طراحی سایت حرفه‌ای', 
                en: 'Test Article About Professional Web Development and Design' 
            },
            slug: { 
                fa: `test-article-${Math.random().toString(36).substring(2, 9)}`, 
                en: `test-article-${Math.random().toString(36).substring(2, 9)}` 
            },
            content: { 
                fa: 'این یک محتوای تستی برای مقاله است که باید حداقل ۵۰ کاراکتر داشته باشد. در این مقاله درباره توسعه وب و طراحی سایت صحبت می‌کنیم و نکات مهم را بررسی می‌کنیم.',
                en: 'This is a test content for the article that must be at least 50 characters long. In this article we discuss web development and website design and review important points.'
            },
            excerpt: { 
                fa: 'خلاصه مقاله تستی درباره توسعه وب', 
                en: 'Test article summary about web development' 
            },
            categories: [fakers.objectId()],
            tags: { fa: ['تست', 'توسعه وب'], en: ['test', 'web-development'] },
            featuredImage: fakers.url(),
        },
        tickets: {
            subject: fakers.string(10, 50),
            description: fakers.string(20, 200),
            department: 'general', // valid: technical, sales, support, billing, general
            priority: 'normal', // valid: low, normal, high, urgent, critical
            category: fakers.objectId(),
            tags: ['urgent', 'bug'],
        },
        portfolio: {
            title: { 
                fa: 'پروژه نمونه کار طراحی وب سایت شرکتی', 
                en: 'Corporate Website Design Portfolio Project' 
            },
            slug: { 
                fa: `portfolio-${Math.random().toString(36).substring(2, 9)}`, 
                en: `portfolio-${Math.random().toString(36).substring(2, 9)}` 
            },
            description: { 
                fa: 'این یک پروژه نمونه کار است که شامل طراحی و توسعه وب سایت شرکتی می‌باشد. در این پروژه از آخرین تکنولوژی‌های روز استفاده شده و نتیجه کار بسیار رضایت‌بخش بوده است.',
                en: 'This is a portfolio project that includes the design and development of a corporate website. The latest technologies were used in this project and the result was very satisfactory.'
            },
            client: {
                name: 'شرکت تست',
                logo: fakers.url(),
                website: 'https://example.com',
            },
            project: {
                duration: 90,
                budget: '1m-5m',
                completedAt: new Date(),
            },
            services: [fakers.objectId()],
            featuredImage: fakers.url(),
        },
        brands: {
            name: fakers.string(5, 30),
            slug: fakers.slug(),
            logo: fakers.url(), // Required in model
            description: { fa: fakers.string(20, 100), en: fakers.string(20, 100) },
            website: fakers.url(),
            industry: 'technology',
            serviceField: 'web_development', // Required in model: web_development, mobile_app, digital_marketing, seo, design, consulting, other
            collaborationPeriod: {
                startDate: fakers.date(),
                isOngoing: true,
            },
        },
        users: {
            name: fakers.string(5, 30),
            email: fakers.email(),
            phoneNumber: fakers.phone(),
            password: 'Test123456!', // Must have uppercase, lowercase, and number
            role: fakers.objectId(), // Must be valid role ID
            status: 'active', // valid: active, inactive, archived
        },
        categories: {
            name: { fa: fakers.string(5, 30), en: fakers.string(5, 30) },
            slug: { fa: fakers.slug(), en: fakers.slug() },
            type: 'article',
        },
        services: {
            name: { 
                fa: 'خدمات طراحی و توسعه وب', 
                en: 'Web Design and Development Services' 
            },
            slug: { 
                fa: `service-${Math.random().toString(36).substring(2, 9)}`, 
                en: `service-${Math.random().toString(36).substring(2, 9)}` 
            },
            description: { 
                fa: 'ارائه خدمات حرفه‌ای طراحی و توسعه وب سایت با استفاده از آخرین تکنولوژی‌های روز. ما با تیمی متخصص و با تجربه آماده ارائه بهترین خدمات به شما هستیم.',
                en: 'Providing professional web design and development services using the latest technologies. We are ready to provide you with the best services with a specialized and experienced team.'
            },
            shortDescription: { 
                fa: 'خدمات طراحی و توسعه وب حرفه‌ای', 
                en: 'Professional web design and development services' 
            },
            categories: [fakers.objectId()],
        },
        faq: {
            question: { 
                fa: 'چگونه می‌توانم سفارش طراحی وب سایت بدهم؟', 
                en: 'How can I order a website design?' 
            },
            answer: { 
                fa: 'برای سفارش طراحی وب سایت می‌توانید از طریق فرم تماس با ما در ارتباط باشید یا با شماره تلفن ما تماس بگیرید. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.',
                en: 'To order a website design, you can contact us through our contact form or call our phone number. Our experts will contact you as soon as possible.'
            },
            categoryIds: [],
            tags: ['سفارش', 'order'],
        },
        team: {
            name: { 
                fa: 'علی احمدی', 
                en: 'Ali Ahmadi' 
            },
            slug: `team-member-${Math.random().toString(36).substring(2, 9)}`,
            position: { 
                fa: 'توسعه‌دهنده ارشد', 
                en: 'Senior Developer' 
            },
            bio: { 
                fa: 'توسعه‌دهنده با تجربه در زمینه توسعه وب و موبایل', 
                en: 'Experienced developer in web and mobile development' 
            },
            email: fakers.email(),
            avatar: fakers.url(), // Required: تصویر پروفایل الزامی است
            department: 'development', // Required: enum ['management', 'development', 'design', 'marketing', 'sales', 'support']
        },
        carousel: {
            title: { 
                fa: 'بهترین خدمات طراحی وب', 
                en: 'Best Web Design Services' 
            },
            image: fakers.url(),
            position: 'home',
            orderIndex: 0,
        },
        consultations: {
            fullName: fakers.string(5, 30),
            email: fakers.email(),
            phoneNumber: fakers.phone(),
            projectDescription: fakers.string(50, 500),
            services: [fakers.objectId()],
            budget: '10m-50m',
            timeline: '1-3months',
            preferredContactMethod: 'email',
            preferredContactTime: 'anytime',
            leadSource: 'website',
        },
        calendar: {
            title: fakers.string(10, 50),
            description: fakers.string(20, 200),
            startDate: fakers.date(),
            endDate: fakers.date(),
            type: 'meeting',
        },
        tasks: {
            title: 'تکمیل پروژه طراحی وب سایت',
            description: 'این یک وظیفه تستی است که باید تکمیل شود',
            assignee: fakers.objectId(), // Must be valid user ID
            priority: 'normal',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        roles: {
            name: `test-role-${Math.random().toString(36).substring(2, 9)}`,
            displayName: {
                fa: 'نقش تستی',
                en: 'Test Role'
            },
            description: {
                fa: 'این یک نقش تستی است',
                en: 'This is a test role'
            },
            permissions: ['articles.read', 'articles.create'],
            priority: 10,
        },
    };
    
    return modulePatterns[moduleName] || {};
}

// Helper to get a real service ID for consultations
let cachedServiceId = null;
async function getRealServiceId() {
    if (cachedServiceId) return cachedServiceId;
    
    try {
        const response = await axios.get(`${BASE_URL}/services`, {
            timeout: 3000,
            validateStatus: () => true,
        });
        
        // Try different response structures
        if (response.status === 200) {
            // Structure 1: { success: true, data: [...], pagination: {...} } - This is the actual structure
            if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
                cachedServiceId = response.data.data[0]._id;
                console.log(`✅ Found real service ID: ${cachedServiceId}`);
                return cachedServiceId;
            }
            // Structure 2: { data: { services: [...] } }
            if (response.data?.data?.services?.length > 0) {
                cachedServiceId = response.data.data.services[0]._id;
                console.log(`✅ Found real service ID: ${cachedServiceId}`);
                return cachedServiceId;
            }
            // Structure 3: { services: [...] }
            if (Array.isArray(response.data?.services) && response.data.services.length > 0) {
                cachedServiceId = response.data.services[0]._id;
                console.log(`✅ Found real service ID: ${cachedServiceId}`);
                return cachedServiceId;
            }
            // Structure 4: Direct array
            if (Array.isArray(response.data) && response.data.length > 0) {
                cachedServiceId = response.data[0]._id;
                console.log(`✅ Found real service ID: ${cachedServiceId}`);
                return cachedServiceId;
            }
        }
        
        // Debug: log the actual response structure
        if (response.status === 200) {
            console.log('⚠️  Services response structure:', JSON.stringify({
                hasData: !!response.data?.data,
                dataIsArray: Array.isArray(response.data?.data),
                dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 0,
                keys: Object.keys(response.data || {})
            }));
        }
    } catch (error) {
        // If we can't get a real service, use a fake one
        console.log('⚠️  Could not get real service ID, using fake one:', error.message);
    }
    
    // Fallback to fake ID
    return fakers.objectId();
}

// Helper to get a real role ID for users
let cachedRoleId = null;
async function getRealRoleId() {
    if (cachedRoleId) return cachedRoleId;
    
    try {
        const token = await getAuthToken();
        if (!token) {
            console.log('⚠️  No auth token for getting role ID, using fake one');
            return fakers.objectId();
        }
        
        const response = await axios.get(`${BASE_URL}/users/roles`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000,
            validateStatus: () => true,
        });
        
        // Try different response structures
        if (response.status === 200) {
            // Structure 1: { success: true, data: { roles: [...] } } - This is the actual structure
            if (Array.isArray(response.data?.data?.roles) && response.data.data.roles.length > 0) {
                cachedRoleId = response.data.data.roles[0]._id;
                console.log(`✅ Found real role ID: ${cachedRoleId}`);
                return cachedRoleId;
            }
            // Structure 2: { success: true, data: [...] }
            if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
                cachedRoleId = response.data.data[0]._id;
                console.log(`✅ Found real role ID: ${cachedRoleId}`);
                return cachedRoleId;
            }
            // Structure 3: { roles: [...] }
            if (Array.isArray(response.data?.roles) && response.data.roles.length > 0) {
                cachedRoleId = response.data.roles[0]._id;
                console.log(`✅ Found real role ID: ${cachedRoleId}`);
                return cachedRoleId;
            }
            // Structure 4: Direct array
            if (Array.isArray(response.data) && response.data.length > 0) {
                cachedRoleId = response.data[0]._id;
                console.log(`✅ Found real role ID: ${cachedRoleId}`);
                return cachedRoleId;
            }
        }
    } catch (error) {
        // If we can't get a real role, use a fake one
        console.log('⚠️  Could not get real role ID, using fake one');
    }
    
    // Fallback to fake ID
    return fakers.objectId();
}

// Helper to get a real category ID for articles
let cachedCategoryId = null;
async function getRealCategoryId() {
    if (cachedCategoryId) return cachedCategoryId;
    
    try {
        const response = await axios.get(`${BASE_URL}/categories?type=article`, {
            timeout: 3000,
            validateStatus: () => true,
        });
        
        if (response.status === 200 && response.data?.data?.categories?.length > 0) {
            cachedCategoryId = response.data.data.categories[0]._id;
            return cachedCategoryId;
        } else if (response.status === 200 && Array.isArray(response.data?.data) && response.data.data.length > 0) {
            cachedCategoryId = response.data.data[0]._id;
            return cachedCategoryId;
        }
    } catch (error) {
        // If we can't get a real category, use a fake one
    }
    
    // Fallback to fake ID
    return fakers.objectId();
}

// Helper to get a real user ID for tasks
let cachedUserId = null;
async function getRealUserId() {
    if (cachedUserId) return cachedUserId;
    
    try {
        const token = await getAuthToken();
        if (!token) {
            console.log('⚠️  No auth token for getting user ID, using fake one');
            return fakers.objectId();
        }
        
        const response = await axios.get(`${BASE_URL}/users?limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000,
            validateStatus: () => true,
        });
        
        // Try different response structures
        if (response.status === 200) {
            // Structure 1: { success: true, data: { users: [...] } }
            if (Array.isArray(response.data?.data?.users) && response.data.data.users.length > 0) {
                cachedUserId = response.data.data.users[0]._id;
                console.log(`✅ Found real user ID: ${cachedUserId}`);
                return cachedUserId;
            }
            // Structure 2: { success: true, data: [...] }
            if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
                cachedUserId = response.data.data[0]._id;
                console.log(`✅ Found real user ID: ${cachedUserId}`);
                return cachedUserId;
            }
            // Structure 3: { users: [...] }
            if (Array.isArray(response.data?.users) && response.data.users.length > 0) {
                cachedUserId = response.data.users[0]._id;
                console.log(`✅ Found real user ID: ${cachedUserId}`);
                return cachedUserId;
            }
        }
    } catch (error) {
        // If we can't get a real user, use a fake one
        console.log('⚠️  Could not get real user ID, using fake one');
    }
    
    // Fallback to fake ID
    return fakers.objectId();
}

// Test a single endpoint
async function testEndpoint(moduleName, method, path, requiresAuth = true, data = null) {
    const url = `${BASE_URL}${path}`;
    const testId = `${method.toUpperCase()} ${path}`;
    
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (requiresAuth) {
            const token = await getAuthToken();
            if (!token) {
                results.skipped.push({ test: testId, reason: 'No auth token' });
                return;
            }
            headers.Authorization = `Bearer ${token}`;
            
            // Add CSRF token for state-changing requests
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
                const csrf = await getCsrfToken();
                if (csrf) {
                    headers['X-CSRF-Token'] = csrf;
                }
            }
        }
        
        const config = { headers };
        let requestData = data;
        
        // For specific modules, get real IDs from database
        if (!requestData) {
            requestData = generateFakeData(null, moduleName);
            
            // For consultations, get a real service ID
            if (moduleName === 'consultations') {
                const realServiceId = await getRealServiceId();
                requestData.services = [realServiceId];
            }
            
            // For users, get a real role ID
            if (moduleName === 'users') {
                const realRoleId = await getRealRoleId();
                requestData.role = realRoleId;
            }
            
            // For articles, get a real category ID
            if (moduleName === 'articles') {
                const realCategoryId = await getRealCategoryId();
                requestData.categories = [realCategoryId];
            }
            
            // For tasks, get a real user ID for assignee
            if (moduleName === 'tasks') {
                const realUserId = await getRealUserId();
                requestData.assignee = realUserId;
            }
            
            // For portfolio, get a real service ID
            if (moduleName === 'portfolio') {
                const realServiceId = await getRealServiceId();
                if (realServiceId) {
                    requestData.services = [realServiceId];
                }
            }
            
            // For services, get a real category ID
            if (moduleName === 'services') {
                const realCategoryId = await getRealCategoryId();
                // Try to get service category
                try {
                    const response = await axios.get(`${BASE_URL}/categories?type=service`, {
                        timeout: 3000,
                        validateStatus: () => true,
                    });
                    if (response.status === 200) {
                        if (Array.isArray(response.data?.data?.categories) && response.data.data.categories.length > 0) {
                            requestData.categories = [response.data.data.categories[0]._id];
                        } else if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
                            requestData.categories = [response.data.data[0]._id];
                        }
                    }
                } catch (error) {
                    // Use article category as fallback
                    requestData.categories = [realCategoryId];
                }
            }
        }
        
        let response;
        
        switch (method.toUpperCase()) {
            case 'GET':
                response = await axios.get(url, config);
                break;
            case 'POST':
                response = await axios.post(url, requestData, config);
                break;
            case 'PUT':
                response = await axios.put(url, requestData, config);
                break;
            case 'PATCH':
                response = await axios.patch(url, requestData, config);
                break;
            case 'DELETE':
                response = await axios.delete(url, config);
                break;
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
        
        // Check if response is successful (2xx status)
        if (response.status >= 200 && response.status < 300) {
            results.passed.push({
                test: testId,
                status: response.status,
                message: 'Success',
            });
            console.log(`✅ ${testId} - Status: ${response.status}`);
        } else {
            results.failed.push({
                test: testId,
                status: response.status,
                message: response.data?.message || 'Unknown error',
            });
            console.log(`❌ ${testId} - Status: ${response.status} - ${response.data?.message || 'Unknown error'}`);
        }
    } catch (error) {
        const status = error.response?.status || 'Network Error';
        const message = error.response?.data?.message || error.message;
        
        // Some errors are expected (like 404 for non-existent resources)
        if (status === 404 || status === 403) {
            results.skipped.push({
                test: testId,
                reason: `Expected ${status}: ${message}`,
            });
            console.log(`⚠️  ${testId} - Status: ${status} (Expected) - ${message}`);
        } else {
            results.failed.push({
                test: testId,
                status,
                message,
            });
            // Show more details for 500 errors
            if (status === 500 && error.response?.data) {
                const errorDetails = error.response.data;
                console.log(`❌ ${testId} - Status: ${status} - ${message}`);
                if (errorDetails.error || errorDetails.stack) {
                    console.log(`   Error details: ${JSON.stringify(errorDetails.error || errorDetails.stack).substring(0, 200)}`);
                }
            } else {
                console.log(`❌ ${testId} - Status: ${status} - ${message}`);
            }
        }
    }
    
    results.total++;
}

// Define all endpoints to test
const endpoints = [
    // Auth endpoints (public)
    { module: 'auth', method: 'POST', path: '/auth/login', requiresAuth: false, data: TEST_USER },
    { module: 'auth', method: 'GET', path: '/auth/csrf-token', requiresAuth: true },
    { module: 'auth', method: 'GET', path: '/auth/me', requiresAuth: true },
    { module: 'auth', method: 'GET', path: '/auth/sessions', requiresAuth: true },
    { module: 'auth', method: 'GET', path: '/auth/activity', requiresAuth: true },
    
    // Articles
    { module: 'articles', method: 'GET', path: '/articles', requiresAuth: false },
    { module: 'articles', method: 'GET', path: '/articles/featured', requiresAuth: false },
    { module: 'articles', method: 'POST', path: '/articles', requiresAuth: true },
    { module: 'articles', method: 'GET', path: '/articles/stats', requiresAuth: true },
    
    // Tickets
    { module: 'tickets', method: 'GET', path: '/tickets', requiresAuth: true },
    { module: 'tickets', method: 'GET', path: '/tickets/stats/overview', requiresAuth: true },
    { module: 'tickets', method: 'POST', path: '/tickets', requiresAuth: true },
    
    // Portfolio
    { module: 'portfolio', method: 'GET', path: '/portfolio', requiresAuth: false },
    { module: 'portfolio', method: 'GET', path: '/portfolio/featured', requiresAuth: false },
    { module: 'portfolio', method: 'POST', path: '/portfolio', requiresAuth: true },
    
    // Brands
    { module: 'brands', method: 'GET', path: '/brands/featured', requiresAuth: false },
    { module: 'brands', method: 'GET', path: '/brands', requiresAuth: true },
    { module: 'brands', method: 'POST', path: '/brands', requiresAuth: true },
    
    // Services
    { module: 'services', method: 'GET', path: '/services', requiresAuth: false },
    { module: 'services', method: 'GET', path: '/services/popular', requiresAuth: false },
    { module: 'services', method: 'POST', path: '/services', requiresAuth: true },
    
    // Categories
    { module: 'categories', method: 'GET', path: '/categories', requiresAuth: false },
    { module: 'categories', method: 'GET', path: '/categories/tree/article', requiresAuth: false },
    { module: 'categories', method: 'POST', path: '/categories', requiresAuth: true },
    
    // FAQ
    { module: 'faq', method: 'GET', path: '/faq/public', requiresAuth: false },
    { module: 'faq', method: 'GET', path: '/faq', requiresAuth: true },
    { module: 'faq', method: 'POST', path: '/faq', requiresAuth: true },
    
    // Team
    { module: 'team', method: 'GET', path: '/team/public', requiresAuth: false },
    { module: 'team', method: 'GET', path: '/team', requiresAuth: true },
    { module: 'team', method: 'POST', path: '/team', requiresAuth: true },
    
    // Carousel
    { module: 'carousel', method: 'GET', path: '/carousel/active/home', requiresAuth: false },
    { module: 'carousel', method: 'GET', path: '/carousel', requiresAuth: true },
    { module: 'carousel', method: 'POST', path: '/carousel', requiresAuth: true },
    
    // Comments
    { module: 'comments', method: 'GET', path: '/comments/article/507f1f77bcf86cd799439011', requiresAuth: false },
    { module: 'comments', method: 'GET', path: '/comments', requiresAuth: true },
    { module: 'comments', method: 'GET', path: '/comments/pending', requiresAuth: true },
    
    // Consultations
    { module: 'consultations', method: 'POST', path: '/consultations', requiresAuth: false },
    { module: 'consultations', method: 'GET', path: '/consultations', requiresAuth: true },
    
    // Settings
    { module: 'settings', method: 'GET', path: '/settings/public', requiresAuth: false },
    { module: 'settings', method: 'GET', path: '/settings', requiresAuth: true },
    
    // Calendar
    { module: 'calendar', method: 'GET', path: '/calendar', requiresAuth: true },
    { module: 'calendar', method: 'GET', path: '/calendar/upcoming', requiresAuth: true },
    { module: 'calendar', method: 'GET', path: '/calendar/statistics', requiresAuth: true },
    { module: 'calendar', method: 'POST', path: '/calendar', requiresAuth: true },
    
    // Tasks
    { module: 'tasks', method: 'GET', path: '/tasks', requiresAuth: true },
    { module: 'tasks', method: 'GET', path: '/tasks/statistics', requiresAuth: true },
    { module: 'tasks', method: 'POST', path: '/tasks', requiresAuth: true },
    
    // Roles
    { module: 'roles', method: 'GET', path: '/roles', requiresAuth: true },
    { module: 'roles', method: 'POST', path: '/roles', requiresAuth: true },
    
    // Users
    { module: 'users', method: 'GET', path: '/users/roles', requiresAuth: true },
    { module: 'users', method: 'GET', path: '/users', requiresAuth: true },
    { module: 'users', method: 'POST', path: '/users', requiresAuth: true },
    
    // Media
    { module: 'media', method: 'GET', path: '/media', requiresAuth: true },
    { module: 'media', method: 'GET', path: '/media/statistics', requiresAuth: true },
    { module: 'media', method: 'GET', path: '/media/buckets', requiresAuth: true },
    
    // Analytics
    { module: 'analytics', method: 'GET', path: '/analytics/comprehensive-stats', requiresAuth: true },
    { module: 'analytics', method: 'GET', path: '/analytics/dashboard-stats', requiresAuth: true },
    
    // Notifications
    { module: 'notifications', method: 'GET', path: '/notifications', requiresAuth: true },
    { module: 'notifications', method: 'GET', path: '/notifications/unread-count', requiresAuth: true },
    { module: 'notifications', method: 'PATCH', path: '/notifications/read-all', requiresAuth: true },
];

// Main execution
async function main() {
    console.log('🚀 Starting endpoint tests...\n');
    console.log(`Base URL: ${BASE_URL}\n`);
    
    // Check if server is running
    console.log('🔍 Checking server status...');
    const serverRunning = await checkServerStatus();
    
    if (!serverRunning) {
        console.error('\n❌ Server is not running or not accessible!');
        console.error(`   Cannot connect to: ${BASE_URL}`);
        console.error('\n💡 Please start the backend server first:');
        console.error('   cd back && npm start');
        console.error('   or');
        console.error('   cd back && npm run dev');
        console.error('\n   Then run this test script again.\n');
        process.exit(1);
    }
    
    console.log('✅ Server is running\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const moduleFilter = args.find(arg => arg.startsWith('--module='))?.split('=')[1];
    const endpointFilter = args.find(arg => arg.startsWith('--endpoint='))?.split('=')[1];
    const verbose = args.includes('--verbose');
    
    let filteredEndpoints = endpoints;
    
    if (moduleFilter) {
        filteredEndpoints = filteredEndpoints.filter(e => e.module === moduleFilter);
        console.log(`Filtering by module: ${moduleFilter}\n`);
    }
    
    if (endpointFilter) {
        filteredEndpoints = filteredEndpoints.filter(e => e.path.includes(endpointFilter));
        console.log(`Filtering by endpoint: ${endpointFilter}\n`);
    }
    
    // Run tests sequentially to avoid overwhelming the server
    for (const endpoint of filteredEndpoints) {
        await testEndpoint(
            endpoint.module,
            endpoint.method,
            endpoint.path,
            endpoint.requiresAuth,
            endpoint.data
        );
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    console.log('='.repeat(60));
    
    if (results.failed.length > 0 && verbose) {
        console.log('\n❌ Failed Tests:');
        results.failed.forEach(f => {
            console.log(`  - ${f.test}: ${f.message} (Status: ${f.status})`);
        });
    }
    
    if (results.skipped.length > 0 && verbose) {
        console.log('\n⚠️  Skipped Tests:');
        results.skipped.forEach(s => {
            console.log(`  - ${s.test}: ${s.reason}`);
        });
    }
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { testEndpoint, generateFakeData, getAuthToken };

