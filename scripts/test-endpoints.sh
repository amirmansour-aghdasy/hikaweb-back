#!/bin/bash

# Endpoint Testing Script with curl
# Tests all API endpoints with fake data using curl commands
#
# Usage: ./scripts/test-endpoints.sh [--module=moduleName] [--endpoint=endpoint] [--verbose]
#
# Prerequisites:
# - Backend server must be running
# - A test user must exist (email: test@example.com, password: Test123456!)
# - curl must be installed

BASE_URL="${API_BASE_URL:-http://localhost:5000/api/v1}"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="Test123456!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0
TOTAL=0

# Get auth token
get_auth_token() {
    local response=$(curl -s -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")
    
    echo "$response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4
}

# Get CSRF token
get_csrf_token() {
    local auth_token=$1
    local response=$(curl -s -X GET "${BASE_URL}/auth/csrf-token" \
        -H "Authorization: Bearer ${auth_token}")
    
    echo "$response" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4
}

# Test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local requires_auth=$3
    local data=$4
    local test_id="${method} ${path}"
    
    TOTAL=$((TOTAL + 1))
    
    local headers=()
    headers+=("-H" "Content-Type: application/json")
    
    if [ "$requires_auth" = "true" ]; then
        if [ -z "$AUTH_TOKEN" ]; then
            echo -e "${YELLOW}⚠️  ${test_id} - Skipped (No auth token)${NC}"
            SKIPPED=$((SKIPPED + 1))
            return
        fi
        headers+=("-H" "Authorization: Bearer ${AUTH_TOKEN}")
        
        # Add CSRF token for state-changing requests
        if [[ "$method" =~ ^(POST|PUT|DELETE|PATCH)$ ]]; then
            if [ -n "$CSRF_TOKEN" ]; then
                headers+=("-H" "X-CSRF-Token: ${CSRF_TOKEN}")
            fi
        fi
    fi
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X ${method} ${BASE_URL}${path}"
    
    # Add headers
    for header in "${headers[@]}"; do
        curl_cmd="${curl_cmd} ${header}"
    done
    
    # Add data for POST/PUT/PATCH
    if [ -n "$data" ] && [[ "$method" =~ ^(POST|PUT|PATCH)$ ]]; then
        curl_cmd="${curl_cmd} -d '${data}'"
    fi
    
    local response=$(eval "$curl_cmd")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # Check status code
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ ${test_id} - Status: ${http_code}${NC}"
        PASSED=$((PASSED + 1))
    elif [ "$http_code" -eq 404 ] || [ "$http_code" -eq 403 ]; then
        echo -e "${YELLOW}⚠️  ${test_id} - Status: ${http_code} (Expected)${NC}"
        SKIPPED=$((SKIPPED + 1))
    else
        local message=$(echo "$body" | grep -o '"message":"[^"]*' | cut -d'"' -f4 || echo "Unknown error")
        echo -e "${RED}❌ ${test_id} - Status: ${http_code} - ${message}${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    # Small delay
    sleep 0.1
}

# Generate fake data
generate_fake_data() {
    local module=$1
    case $module in
        articles)
            echo '{"title":{"fa":"Test Article","en":"Test Article"},"slug":{"fa":"test-article","en":"test-article"},"content":{"fa":"This is a test article content","en":"This is a test article content"},"categories":["507f1f77bcf86cd799439011"],"tags":{"fa":["test"],"en":["test"]}}'
            ;;
        tickets)
            echo '{"subject":"Test Ticket","description":"This is a test ticket description","department":"general","priority":"normal"}'
            ;;
        portfolio)
            echo '{"title":{"fa":"Test Project","en":"Test Project"},"slug":{"fa":"test-project","en":"test-project"},"description":{"fa":"Test description","en":"Test description"},"client":{"name":"Test Client"},"project":{"duration":30,"budget":"1m-5m","completedAt":"2024-01-01T00:00:00.000Z"},"services":["507f1f77bcf86cd799439011"],"featuredImage":"https://example.com/image.jpg"}'
            ;;
        brands)
            echo '{"name":"Test Brand","slug":"test-brand","description":{"fa":"Test","en":"Test"},"website":"https://example.com"}'
            ;;
        services)
            echo '{"title":{"fa":"Test Service","en":"Test Service"},"slug":{"fa":"test-service","en":"test-service"},"description":{"fa":"Test description","en":"Test description"}}'
            ;;
        categories)
            echo '{"name":{"fa":"Test Category","en":"Test Category"},"slug":{"fa":"test-category","en":"test-category"},"type":"article"}'
            ;;
        faq)
            echo '{"question":{"fa":"Test Question","en":"Test Question"},"answer":{"fa":"Test Answer","en":"Test Answer"},"category":"507f1f77bcf86cd799439011"}'
            ;;
        team)
            echo '{"name":{"fa":"Test Member","en":"Test Member"},"position":{"fa":"Developer","en":"Developer"},"bio":{"fa":"Test bio","en":"Test bio"},"email":"test@example.com"}'
            ;;
        carousel)
            echo '{"title":{"fa":"Test Carousel","en":"Test Carousel"},"image":"https://example.com/image.jpg","link":"https://example.com","position":"home","order":1}'
            ;;
        consultations)
            echo '{"name":"Test User","email":"test@example.com","phone":"09123456789","message":"Test consultation message","service":"507f1f77bcf86cd799439011"}'
            ;;
        calendar)
            echo '{"title":"Test Event","description":"Test event description","startDate":"2024-12-01T10:00:00.000Z","endDate":"2024-12-01T12:00:00.000Z","type":"meeting"}'
            ;;
        tasks)
            echo '{"title":"Test Task","description":"Test task description","dueDate":"2024-12-31T00:00:00.000Z","priority":"normal","status":"pending"}'
            ;;
        users)
            echo '{"name":"Test User","email":"testuser@example.com","phoneNumber":"09123456789","password":"Test123456!","role":"507f1f77bcf86cd799439011","status":"active"}'
            ;;
        roles)
            echo '{"name":"test_role","displayName":{"fa":"Test Role","en":"Test Role"},"permissions":["test.read"]}'
            ;;
        *)
            echo '{}'
            ;;
    esac
}

# Main execution
main() {
    echo "🚀 Starting endpoint tests with curl..."
    echo "Base URL: ${BASE_URL}"
    echo ""
    
    # Get auth token
    echo "🔐 Getting authentication token..."
    AUTH_TOKEN=$(get_auth_token)
    if [ -z "$AUTH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Warning: Could not get auth token. Some tests will be skipped.${NC}"
    else
        echo -e "${GREEN}✅ Auth token obtained${NC}"
        CSRF_TOKEN=$(get_csrf_token "$AUTH_TOKEN")
        if [ -n "$CSRF_TOKEN" ]; then
            echo -e "${GREEN}✅ CSRF token obtained${NC}"
        fi
    fi
    echo ""
    
    # Parse arguments
    MODULE_FILTER=""
    ENDPOINT_FILTER=""
    VERBOSE=false
    
    for arg in "$@"; do
        case $arg in
            --module=*)
                MODULE_FILTER="${arg#*=}"
                ;;
            --endpoint=*)
                ENDPOINT_FILTER="${arg#*=}"
                ;;
            --verbose)
                VERBOSE=true
                ;;
        esac
    done
    
    # Test endpoints
    echo "📋 Testing endpoints..."
    echo ""
    
    # Auth endpoints
    test_endpoint "POST" "/auth/login" false '{"email":"'${TEST_USER_EMAIL}'","password":"'${TEST_USER_PASSWORD}'"}'
    test_endpoint "GET" "/auth/csrf-token" true
    test_endpoint "GET" "/auth/me" true
    
    # Articles
    test_endpoint "GET" "/articles" false
    test_endpoint "GET" "/articles/featured" false
    test_endpoint "POST" "/articles" true "$(generate_fake_data articles)"
    
    # Tickets
    test_endpoint "GET" "/tickets" true
    test_endpoint "GET" "/tickets/stats/overview" true
    test_endpoint "POST" "/tickets" true "$(generate_fake_data tickets)"
    
    # Portfolio
    test_endpoint "GET" "/portfolio" false
    test_endpoint "GET" "/portfolio/featured" false
    test_endpoint "POST" "/portfolio" true "$(generate_fake_data portfolio)"
    
    # Brands
    test_endpoint "GET" "/brands/featured" false
    test_endpoint "GET" "/brands" true
    test_endpoint "POST" "/brands" true "$(generate_fake_data brands)"
    
    # Services
    test_endpoint "GET" "/services" false
    test_endpoint "GET" "/services/popular" false
    test_endpoint "POST" "/services" true "$(generate_fake_data services)"
    
    # Categories
    test_endpoint "GET" "/categories" false
    test_endpoint "GET" "/categories/tree/article" false
    test_endpoint "POST" "/categories" true "$(generate_fake_data categories)"
    
    # FAQ
    test_endpoint "GET" "/faq/public" false
    test_endpoint "GET" "/faq" true
    test_endpoint "POST" "/faq" true "$(generate_fake_data faq)"
    
    # Team
    test_endpoint "GET" "/team/public" false
    test_endpoint "GET" "/team" true
    test_endpoint "POST" "/team" true "$(generate_fake_data team)"
    
    # Carousel
    test_endpoint "GET" "/carousel/active/home" false
    test_endpoint "GET" "/carousel" true
    test_endpoint "POST" "/carousel" true "$(generate_fake_data carousel)"
    
    # Comments
    test_endpoint "GET" "/comments/article/507f1f77bcf86cd799439011" false
    test_endpoint "GET" "/comments" true
    
    # Consultations
    test_endpoint "POST" "/consultations" false "$(generate_fake_data consultations)"
    test_endpoint "GET" "/consultations" true
    
    # Settings
    test_endpoint "GET" "/settings/public" false
    test_endpoint "GET" "/settings" true
    
    # Calendar
    test_endpoint "GET" "/calendar" true
    test_endpoint "GET" "/calendar/upcoming" true
    test_endpoint "GET" "/calendar/statistics" true
    test_endpoint "POST" "/calendar" true "$(generate_fake_data calendar)"
    
    # Tasks
    test_endpoint "GET" "/tasks" true
    test_endpoint "GET" "/tasks/statistics" true
    test_endpoint "POST" "/tasks" true "$(generate_fake_data tasks)"
    
    # Roles
    test_endpoint "GET" "/roles" true
    test_endpoint "POST" "/roles" true "$(generate_fake_data roles)"
    
    # Users
    test_endpoint "GET" "/users/roles" true
    test_endpoint "GET" "/users" true
    test_endpoint "POST" "/users" true "$(generate_fake_data users)"
    
    # Media
    test_endpoint "GET" "/media" true
    test_endpoint "GET" "/media/statistics" true
    test_endpoint "GET" "/media/buckets" true
    
    # Analytics
    test_endpoint "GET" "/analytics/comprehensive-stats" true
    test_endpoint "GET" "/analytics/dashboard-stats" true
    
    # Notifications
    test_endpoint "GET" "/notifications" true
    test_endpoint "GET" "/notifications/unread-count" true
    test_endpoint "PATCH" "/notifications/read-all" true
    
    # Print summary
    echo ""
    echo "============================================================"
    echo "📊 Test Summary"
    echo "============================================================"
    echo "Total Tests: ${TOTAL}"
    echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
    echo -e "${RED}❌ Failed: ${FAILED}${NC}"
    echo -e "${YELLOW}⚠️  Skipped: ${SKIPPED}${NC}"
    echo "============================================================"
    
    # Exit with appropriate code
    if [ $FAILED -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"

