#!/bin/bash
# Run this on your EC2 server to get full backend logs

echo "=== Checking if backend container is running ==="
sudo docker ps -a | grep pomodify-backend

echo ""
echo "=== Full backend logs (last 500 lines) ==="
sudo docker logs pomodify-backend 2>&1 | tail -500

echo ""
echo "=== Searching for errors ==="
sudo docker logs pomodify-backend 2>&1 | grep -i "error\|exception\|failed\|caused by" | tail -50

echo ""
echo "=== Checking Flyway logs ==="
sudo docker logs pomodify-backend 2>&1 | grep -i "flyway"

echo ""
echo "=== Checking database connection ==="
sudo docker logs pomodify-backend 2>&1 | grep -i "database\|connection\|hikari"
