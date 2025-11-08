#!/usr/bin/env bash

# Test Authentication System
# Run this after services are up

set -e

BASE_URL="http://localhost:8000/api/v1"

echo "🧪 Testing Authentication System"
echo "================================"

# Test 1: Register a new user
echo ""
echo "1️⃣  Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

# Test 2: Login
echo ""
echo "2️⃣  Logging in..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123")

echo "$TOKEN_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

# Test 3: Get current user
echo ""
echo "3️⃣  Getting current user info..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'

# Test 4: Try invalid token
echo ""
echo "4️⃣  Testing invalid token (should fail)..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer invalid_token" | jq '.'

echo ""
echo "✅ Authentication tests complete!"
