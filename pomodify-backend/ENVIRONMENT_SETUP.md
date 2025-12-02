# Environment Configuration Guide

This guide explains how to properly manage sensitive configuration data for the Pomodify API.

## Overview

Sensitive information like database credentials and JWT secrets should **never** be committed to version control. Instead, we use environment variables and Spring profiles to manage configuration securely.

## Setup Instructions

### 1. Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```properties
# Database Configuration
DB_URL=jdbc:postgresql://localhost:5432/pomodifydb
DB_USERNAME=your_actual_username
DB_PASSWORD=your_actual_password
DDL_AUTO=update
SHOW_SQL=true

# JWT Configuration
JWT_SECRET=your_actual_256_bit_secret_key_here_minimum_32_characters
JWT_ACCESS_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=2592000000
```

### 2. Spring Profiles

We use different configuration approaches:

- **`application.properties`**: Main configuration with environment variable placeholders
- **`application-dev.properties`**: Development profile with safe defaults
- **`.env`**: Local environment variables (not committed to git)

### 3. Running the Application

#### Option A: Using Environment Variables (Recommended)

Set environment variables in your IDE or terminal:

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export JWT_SECRET=your_secret_key
./mvnw spring-boot:run
```

#### Option B: Using Spring Profiles

Create a local properties file (already in .gitignore):

```bash
cp src/main/resources/application-dev.properties src/main/resources/application-local.properties
```

Edit `application-local.properties` with your actual values, then run:

```bash
./mvnw spring-boot:run -Dspring.profiles.active=local
```

#### Option C: IDE Configuration

In your IDE (IntelliJ IDEA, Eclipse, VS Code):

1. Go to Run Configuration
2. Add environment variables:
   - `DB_USERNAME=postgres`
   - `DB_PASSWORD=your_password`
   - `JWT_SECRET=your_secret_key`

### 4. Production Deployment

For production, set environment variables through your deployment platform:

- **Docker**: Use environment variables in docker-compose or Dockerfile
- **Kubernetes**: Use ConfigMaps and Secrets
- **Cloud Platforms**: Use platform-specific environment variable management

## Security Best Practices

1. **Never commit sensitive data** to version control
2. **Use strong JWT secrets** (minimum 256 bits / 32 characters)
3. **Rotate secrets regularly** in production
4. **Use different secrets** for different environments
5. **Limit database user privileges** to only what's needed
6. **Use encrypted connections** in production

## Frontend Test Harness

Two lightweight options exist for exercising the API during development:

1. **Standalone Browser Test Page**: Opens directly in the browser and lets you manually invoke session endpoints and subscribe to SSE updates.
2. **Angular Test Harness** (`test/angular/pomodify-test`): Minimal Angular app covering auth, categories, activities, full session lifecycle and push notification preference management (register / enable / disable / status). It also logs foreground Firebase Cloud Messaging notifications.

### Angular Harness Quick Start
```bash
cd test/angular/pomodify-test
npm install
npm start
```

Configure Firebase credentials and `vapidKey` in `src/environments/environment.ts` before initializing push. Ensure the backend base URL in `ApiService` matches your running server.

For background push handling you can later add a `firebase-messaging-sw.js` at project root (not included by default).

## File Structure

```
src/main/resources/
├── application.properties          # Main config with env vars
├── application-dev.properties      # Development defaults
└── application-local.properties    # Local overrides (gitignored)

.env.example                        # Template for environment variables
.env                               # Your actual env vars (gitignored)
```

## Troubleshooting

### Missing Environment Variables

If you get startup errors about missing configuration:

1. Check that all required environment variables are set
2. Verify `.env` file exists and has correct values
3. Ensure your IDE is configured with environment variables

### Database Connection Issues

1. Verify database is running: `pg_isready -h localhost -p 5432`
2. Check database exists: `psql -h localhost -U postgres -l`
3. Test connection: `psql -h localhost -U postgres -d pomodifydb`

### JWT Issues

1. Ensure JWT_SECRET is at least 32 characters long
2. Use a cryptographically secure random string
3. Generate a new secret: `openssl rand -base64 32`