#!/bin/bash
# Comprehensive deployment diagnostic script
# Run this on your EC2 server: bash diagnose-deployment.sh

echo "════════════════════════════════════════════════════════════"
echo "POMODIFY DEPLOYMENT DIAGNOSTICS"
echo "════════════════════════════════════════════════════════════"
echo ""

# 1. Check Docker
echo "1. DOCKER STATUS"
echo "────────────────────────────────────────────────────────────"
docker --version
echo ""

# 2. Check containers
echo "2. CONTAINER STATUS"
echo "────────────────────────────────────────────────────────────"
echo "Running containers:"
sudo docker ps | grep pomodify || echo "No running pomodify containers"
echo ""
echo "All containers (including stopped):"
sudo docker ps -a | grep pomodify || echo "No pomodify containers found"
echo ""

# 3. Check network
echo "3. DOCKER NETWORK"
echo "────────────────────────────────────────────────────────────"
sudo docker network ls | grep pomodify-net || echo "pomodify-net network not found"
echo ""

# 4. Backend logs - FULL
echo "4. BACKEND LOGS (FULL)"
echo "────────────────────────────────────────────────────────────"
if sudo docker ps -a | grep -q pomodify-backend; then
    sudo docker logs pomodify-backend 2>&1
else
    echo "Backend container not found"
fi
echo ""

# 5. Error analysis
echo "5. ERROR ANALYSIS"
echo "────────────────────────────────────────────────────────────"
if sudo docker ps -a | grep -q pomodify-backend; then
    echo "Searching for errors, exceptions, and failures:"
    sudo docker logs pomodify-backend 2>&1 | grep -i "error\|exception\|failed\|caused by\|cannot\|unable" || echo "No errors found"
else
    echo "Backend container not found"
fi
echo ""

# 6. Flyway analysis
echo "6. FLYWAY MIGRATION STATUS"
echo "────────────────────────────────────────────────────────────"
if sudo docker ps -a | grep -q pomodify-backend; then
    sudo docker logs pomodify-backend 2>&1 | grep -i "flyway" || echo "No Flyway logs found"
else
    echo "Backend container not found"
fi
echo ""

# 7. Database connection
echo "7. DATABASE CONNECTION"
echo "────────────────────────────────────────────────────────────"
if sudo docker ps -a | grep -q pomodify-backend; then
    sudo docker logs pomodify-backend 2>&1 | grep -i "database\|connection\|hikari\|postgresql" | head -20 || echo "No database connection logs found"
else
    echo "Backend container not found"
fi
echo ""

# 8. Container exit code
echo "8. CONTAINER EXIT STATUS"
echo "────────────────────────────────────────────────────────────"
if sudo docker ps -a | grep -q pomodify-backend; then
    CONTAINER_ID=$(sudo docker ps -a | grep pomodify-backend | awk '{print $1}')
    EXIT_CODE=$(sudo docker inspect $CONTAINER_ID --format='{{.State.ExitCode}}')
    echo "Exit Code: $EXIT_CODE"
    if [ "$EXIT_CODE" != "0" ]; then
        echo "Container exited with error code $EXIT_CODE"
    fi
else
    echo "Backend container not found"
fi
echo ""

# 9. Port check
echo "9. PORT AVAILABILITY"
echo "────────────────────────────────────────────────────────────"
echo "Checking if port 8081 is in use:"
sudo netstat -tlnp | grep 8081 || echo "Port 8081 is not in use"
echo ""

# 10. Test database connection directly
echo "10. DIRECT DATABASE CONNECTION TEST"
echo "────────────────────────────────────────────────────────────"
echo "Testing PostgreSQL connection..."
if command -v psql >/dev/null 2>&1; then
    # You'll need to provide these values
    read -p "Enter DB_HOST: " DB_HOST
    read -p "Enter DB_PORT (default 5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Enter DB_NAME: " DB_NAME
    read -p "Enter DB_USERNAME: " DB_USERNAME
    read -sp "Enter DB_PASSWORD: " DB_PASSWORD
    echo ""
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" -p "$DB_PORT" -c '\q' 2>&1; then
        echo "✅ Database connection successful"
        
        # Check tables
        echo ""
        echo "Database tables:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" -p "$DB_PORT" -c '\dt' 2>&1
        
        # Check Flyway history
        echo ""
        echo "Flyway migration history:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" -p "$DB_PORT" -c 'SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;' 2>&1
    else
        echo "❌ Database connection failed"
    fi
else
    echo "psql not installed, skipping database test"
fi
echo ""

# 11. Image info
echo "11. DOCKER IMAGE INFO"
echo "────────────────────────────────────────────────────────────"
sudo docker images | grep pomodify || echo "No pomodify images found"
echo ""

# 12. Disk space
echo "12. DISK SPACE"
echo "────────────────────────────────────────────────────────────"
df -h | grep -E "Filesystem|/$"
echo ""

# 13. Memory
echo "13. MEMORY USAGE"
echo "────────────────────────────────────────────────────────────"
free -h
echo ""

echo "════════════════════════════════════════════════════════════"
echo "DIAGNOSTICS COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Review the logs above for errors"
echo "2. Check if Flyway migrations completed successfully"
echo "3. Verify database connection is working"
echo "4. If container exited, check the exit code and error messages"
echo ""
