# ----------------------------
# Stage 1: Build Angular
# ----------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build Angular in production mode (no source maps for speed)
RUN npx ng build --configuration=production --source-map=false

# ----------------------------
# Stage 2: Serve with nginx
# ----------------------------
FROM nginx:alpine

# Security: Update Alpine packages to fix vulnerabilities
# Fixes: CVE-2025-64720, CVE-2025-65018 (libpng buffer overflow vulnerabilities)
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

# Copy built Angular files from Stage 1
COPY --from=build /app/dist/pomodify-frontend/browser /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
