#!/usr/bin/env node

/**
 * Debug script to test specific endpoints and see detailed errors
 */

import axios from 'axios';
import { config } from '../src/config/environment.js';

const BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api/v1';

async function testLogin() {
    console.log('\n🔍 Testing POST /auth/login...\n');
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: 'Test123456!',
        });
        
        console.log('✅ Login successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return response.data?.data?.tokens?.accessToken || response.data?.data?.accessToken;
    } catch (error) {
        console.log('❌ Login failed!');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message || error.message);
        console.log('\nFull error response:');
        console.log(JSON.stringify(error.response?.data, null, 2));
        
        if (error.response?.data?.error) {
            console.log('\nError details:');
            console.log(JSON.stringify(error.response.data.error, null, 2));
        }
        
        if (error.response?.data?.stack) {
            console.log('\nStack trace:');
            console.log(error.response.data.stack);
        }
        
        return null;
    }
}

async function testConsultations(token = null) {
    console.log('\n🔍 Testing POST /consultations...\n');
    
    // First, get a real service ID
    let serviceId = null;
    try {
        console.log('Getting services list...');
        const servicesResponse = await axios.get(`${BASE_URL}/services`);
        if (servicesResponse.data?.data?.services?.length > 0) {
            serviceId = servicesResponse.data.data.services[0]._id;
            console.log(`✅ Found service: ${serviceId}`);
        } else if (Array.isArray(servicesResponse.data?.data) && servicesResponse.data.data.length > 0) {
            serviceId = servicesResponse.data.data[0]._id;
            console.log(`✅ Found service: ${serviceId}`);
        } else {
            console.log('⚠️  No services found, using fake ID');
            serviceId = '507f1f77bcf86cd799439011';
        }
    } catch (error) {
        console.log('⚠️  Could not get services, using fake ID');
        serviceId = '507f1f77bcf86cd799439011';
    }
    
    const consultationData = {
        fullName: 'تست کاربر',
        email: 'test@example.com',
        phoneNumber: '09123456789',
        projectDescription: 'این یک تست برای بررسی endpoint consultations است',
        services: [serviceId],
        budget: '10m-50m',
        timeline: '1-3months',
        preferredContactMethod: 'email',
        preferredContactTime: 'anytime',
        leadSource: 'website',
    };
    
    console.log('Sending consultation data:');
    console.log(JSON.stringify(consultationData, null, 2));
    
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await axios.post(`${BASE_URL}/consultations`, consultationData, { headers });
        
        console.log('\n✅ Consultation created successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('\n❌ Consultation creation failed!');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message || error.message);
        console.log('\nFull error response:');
        console.log(JSON.stringify(error.response?.data, null, 2));
        
        if (error.response?.data?.error) {
            console.log('\nError details:');
            console.log(JSON.stringify(error.response.data.error, null, 2));
        }
        
        if (error.response?.data?.stack) {
            console.log('\nStack trace:');
            console.log(error.response.data.stack);
        }
    }
}

async function main() {
    console.log('🚀 Starting debug tests...\n');
    console.log(`Base URL: ${BASE_URL}\n`);
    
    // Test login
    const token = await testLogin();
    
    // Test consultations
    await testConsultations(token);
    
    console.log('\n✅ Debug tests completed!\n');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

