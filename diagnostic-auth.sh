#!/bin/bash

###############################################################################
# Diagnostic Script: Test Authorization Header Forwarding & Token Validity
# Purpose: Pinpoint whether 401s are caused by:
#   1. Missing Authorization header at backend
#   2. Invalid/expired token
#   3. Wrong JWT secret
# 
# Usage on EC2:
#   1. Get a valid access token from the browser (DevTools → localStorage → accessToken)
#   2. Run: bash diagnostic-auth.sh <TOKEN>
#   Example: bash diagnostic-auth.sh eyJhbGc...
###############################################################################

set -e

if [ -z "$1" ]; then
  echo "❌ Usage: $0 <ACCESS_TOKEN>"
  echo ""
  echo "Instructions to get a valid token:"
  echo "  1. Open https://pomodify.site in browser"
  echo "  2. Login with valid credentials"
  echo "  3. Open DevTools (F12) → Console"
  echo "  4. Type: localStorage.getItem('accessToken')"
  echo "  5. Copy the token and pass it to this script"
  echo ""
  exit 1
fi

TOKEN="$1"

echo "════════════════════════════════════════════════════════════════"
echo "🔍 Authorization Header Diagnostic Script"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 1: Direct backend (localhost:8081 - bypasses all proxies)
echo "────────────────────────────────────────────────────────────────"
echo "TEST 1: Direct to Backend Container on Docker Network"
echo "────────────────────────────────────────────────────────────────"
echo "This test calls backend directly on the Docker network."
echo "If this succeeds (200), the backend accepts the token & header."
echo "If this fails (401), the token is invalid or signed wrong."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:8081/api/v1/activities)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Response Code: $HTTP_CODE"
echo "Response Body (first 200 chars): ${BODY:0:200}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ TEST 1 PASSED: Backend accepted the Authorization header and token!"
  echo "   Conclusion: Backend is fine. Problem is likely upstream proxy."
  TEST1_PASS=1
else
  echo "❌ TEST 1 FAILED: Backend returned $HTTP_CODE"
  echo "   Conclusion: Token is invalid, expired, or wrong JWT secret."
  TEST1_PASS=0
fi

echo ""

# Test 2: Via frontend container → backend (ensures Docker network forwarding works)
echo "────────────────────────────────────────────────────────────────"
echo "TEST 2: Frontend Container → Backend (via Docker network)"
echo "────────────────────────────────────────────────────────────────"
echo "This test curls from INSIDE the frontend container to backend."
echo "If this succeeds (200) and Test 1 failed (401), the issue is"
echo "  upstream (host nginx or TLS terminator) stripping headers."
echo "If this also fails (401), the backend has an issue with the token."
echo ""

# Check if frontend container exists
if ! sudo docker ps | grep -q pomodify-frontend; then
  echo "⚠️  TEST 2 SKIPPED: Frontend container not running"
  TEST2_PASS=0
else
  RESPONSE2=$(sudo docker exec -it pomodify-frontend \
    curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${TOKEN}" \
    http://pomodify-backend:8081/api/v1/activities 2>&1)

  HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
  BODY2=$(echo "$RESPONSE2" | head -n-1)

  echo "Response Code: $HTTP_CODE2"
  echo "Response Body (first 200 chars): ${BODY2:0:200}"
  echo ""

  if [ "$HTTP_CODE2" = "200" ]; then
    echo "✅ TEST 2 PASSED: Frontend container → backend successful!"
    echo "   Conclusion: Container-to-container communication is fine."
    TEST2_PASS=1
  else
    echo "⚠️  TEST 2 FAILED: Frontend container got $HTTP_CODE2"
    echo "   Conclusion: Either backend rejects token or container-to-container network issue."
    TEST2_PASS=0
  fi
fi

echo ""

# Test 3: Check backend logs for JWT errors
echo "────────────────────────────────────────────────────────────────"
echo "TEST 3: Backend Logs (last 50 lines for JWT/auth errors)"
echo "────────────────────────────────────────────────────────────────"
echo "Looking for JwtException or auth-related errors..."
echo ""

if sudo docker ps | grep -q pomodify-backend; then
  LOGS=$(sudo docker logs pomodify-backend 2>&1 | tail -50)
  
  if echo "$LOGS" | grep -i "jwtexception\|jwt\|token.*revoked\|signature does not match" > /dev/null; then
    echo "❌ FOUND JWT/Token Errors in Backend Logs:"
    echo "$LOGS" | grep -i "jwtexception\|jwt\|token.*revoked\|signature does not match" || true
  else
    echo "✅ No obvious JWT errors found in recent logs."
  fi
  
  echo ""
  echo "Full backend logs (last 20 lines):"
  echo "$LOGS" | tail -20
else
  echo "⚠️  Backend container not running"
fi

echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "📊 DIAGNOSTIC SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ "$TEST1_PASS" -eq 1 ]; then
  echo "✅ Backend accepts the token."
  echo ""
  echo "Next steps:"
  echo "  1. Check if host nginx (TLS terminator) is stripping Authorization header"
  echo "  2. Ensure frontend nginx.conf forwards Authorization header (see below)"
  echo "  3. Add 'proxy_set_header Authorization \$http_authorization;' to nginx.conf"
  echo ""
else
  echo "❌ Backend rejects the token (401)."
  echo ""
  echo "Possible causes:"
  echo "  1. Token is expired"
  echo "  2. Token was signed with a different JWT_SECRET"
  echo "  3. Token has been revoked"
  echo "  4. Token signature is invalid"
  echo ""
  echo "Next steps:"
  echo "  1. Confirm JWT_SECRET in deploy.yml matches what was used to sign the token"
  echo "  2. Check backend logs above for specific JWT error messages"
  echo "  3. If JWT_SECRET was recently changed, re-login to get a new token"
  echo ""
fi

echo ""
echo "Optional: Add this to pomodify-frontend/nginx.conf in the /api/ location block:"
echo "  proxy_set_header Authorization \$http_authorization;"
echo ""
echo "════════════════════════════════════════════════════════════════"
