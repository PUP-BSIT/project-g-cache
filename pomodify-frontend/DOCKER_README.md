# 🐳 Pomodify Frontend - Docker Setup

This guide shows how to run the frontend locally with Docker before deploying to AWS.

## ✅ Prerequisites

- Docker installed on your machine
- Docker Compose installed (comes with Docker Desktop)

---

## 📌 Quick Start (Using Docker Compose)

### **Option 1: Using docker-compose (Easiest)**

```bash
# From pomodify-frontend directory
docker-compose up --build
```

Then open: **http://localhost:3000**

To stop:
```bash
docker-compose down
```

---

## 🔨 Manual Docker Commands (Without Compose)

### **Step 1: Build the image**

```bash
docker build -t pomodify-frontend .
```

### **Step 2: Run the container**

```bash
docker run -d \
  --name pomodify-frontend \
  -p 3000:80 \
  pomodify-frontend
```

### **Step 3: Verify it's running**

```bash
docker ps
```

You should see: `0.0.0.0:3000->80/tcp`

### **Step 4: Check logs**

```bash
docker logs pomodify-frontend
```

### **Step 5: Open in browser**

```
http://localhost:3000
```

---

## 🛑 Stop & Clean Up

```bash
# Stop the container
docker stop pomodify-frontend

# Remove the container
docker rm pomodify-frontend

# Remove the image (optional)
docker rmi pomodify-frontend
```

---

## 🔗 API Integration (Local Testing)

The `nginx.conf` is already configured to proxy API requests:
- Frontend at: `http://localhost:3000`
- API calls to `/api/` → `http://localhost:8081` (backend)

If your backend is running on port 8081, it should work automatically!

---

## 📦 For AWS EC2 Deployment

Once tested locally, deploy to EC2:

1. Build locally: `npm run build`
2. Upload `dist/pomodify-frontend/browser` to EC2
3. Copy the `Dockerfile` and `nginx.conf` to EC2
4. Run the same Docker commands on EC2
5. Configure NGINX reverse proxy for your domain

---

## 📝 Key Files

- **Dockerfile** - Multi-stage build (build + serve)
- **docker-compose.yml** - Easy local testing
- **nginx.conf** - Routes, caching, API proxying

---

## ✅ Testing the Frontend

1. **Run locally**: `docker-compose up --build`
2. **Open**: http://localhost:3000
3. **Check**: All pages load, routing works
4. **API calls**: Should proxy to backend if running on 8081
5. **Ready to deploy!**

