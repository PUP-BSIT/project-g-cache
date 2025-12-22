#!/bin/bash
# Simple manual backend test script
# Usage: bash test-backend-manual.sh

set -e

echo "🧪 Testing Backend Deployment Manually"
echo ""

# Configuration
DB_HOST="pomodify-db.cyvgaequcp4n.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="dbpomodify"
DB_USERNAME="pomodify_user"
DB_PASSWORD="Qazplm891251"
JWT_SECRET="1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3"

echo "1. Stopping old backend container..."
sudo docker stop pomodify-backend 2>/dev/null || true
sudo docker rm pomodify-backend 2>/dev/null || true

echo "2. Pulling latest image..."
sudo docker pull gm1026/pomodify-backend:latest

echo "3. Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" -p "$DB_PORT" -c '\q' 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo "4. Starting backend container with DDL_AUTO=none..."
sudo docker run -d \
  --name pomodify-backend \
  --network pomodify-net \
  --restart unless-stopped \
  -p 8081:8081 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e DDL_AUTO=none \
  -e SHOW_SQL=false \
  -e JWT_SECRET="$JWT_SECRET" \
  -e JWT_ACCESS_EXPIRATION=900000 \
  -e JWT_REFRESH_EXPIRATION=2592000000 \
  -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET \
  -e SMTP_USERNAME=contact@pomodify.site \
  -e SMTP_PASSWORD='Qazplm@891251' \
  -e GOOGLE_API_KEY=AIzaSyD3G6UoPZSM51BBOOs7_2H6Nrv4GA6f9xI \
  gm1026/pomodify-backend:latest

CONTAINER_ID=$(sudo docker ps -q -f name=pomodify-backend)
echo "✅ Container started: $CONTAINER_ID"

echo ""
echo "5. Waiting 10 seconds for initial startup..."
sleep 10

echo ""
echo "6. Checking container status..."
if sudo docker ps | grep -q pomodify-backend; then
    echo "✅ Container is running"
else
    echo "❌ Container is NOT running!"
    echo ""
    echo "Container logs:"
    sudo docker logs pomodify-backend 2>&1
    exit 1
fi

echo ""
echo "7. Showing startup logs (first 100 lines)..."
sudo docker logs pomodify-backend 2>&1 | head -100

echo ""
echo "8. Checking for errors..."
ERROR_COUNT=$(sudo docker logs pomodify-backend 2>&1 | grep -i "error\|exception" | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "⚠️  Found $ERROR_COUNT error/exception lines:"
    sudo docker logs pomodify-backend 2>&1 | grep -i "error\|exception" | head -20
else
    echo "✅ No errors found in logs"
fi

echo ""
echo "9. Waiting 60 seconds for full startup..."
sleep 60

echo ""
echo "10. Testing health endpoint..."
for i in {1..10}; do
    echo "Attempt $i/10..."
    if curl -f -s http://localhost:8081/actuator/health | grep -q "UP"; then
        echo "✅ Backend is healthy!"
        curl -s http://localhost:8081/actuator/health | jq . || curl -s http://localhost:8081/actuator/health
        exit 0
    fi
    sleep 5
done

echo "❌ Backend health check failed after 10 attempts"
echo ""
echo "Full logs:"
sudo docker logs pomodify-backend 2>&1

exit 1
