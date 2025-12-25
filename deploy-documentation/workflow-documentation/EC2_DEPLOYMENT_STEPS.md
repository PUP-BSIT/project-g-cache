# 🚀 FRONTEND DEPLOYMENT TO EC2 - COMPLETE GUIDE

This guide covers **Step 5** (Upload to EC2) and **Step 6** (Configure NGINX Reverse Proxy).

---

# 📌 **STEP 5 — UPLOAD FILES TO EC2**

## **5A. Create directory on EC2**

**On EC2 (via SSH):**

```bash
ssh -i ~/.ssh/g-cache.pem ubuntu@3.106.212.47
```

Once connected, run:

```bash
mkdir -p ~/pomodify-frontend
cd ~/pomodify-frontend
pwd
```

You should see: `/home/ubuntu/pomodify-frontend`

---

## **5B. Upload files from your laptop**

**On your laptop (NOT EC2), run these 3 commands:**

### **Command 1: Upload browser dist folder**
```bash
scp -i ~/.ssh/g-cache.pem -r c:\project-g-cache\pomodify-frontend\dist\pomodify-frontend\browser ubuntu@3.106.212.47:~/pomodify-frontend/
```

### **Command 2: Upload Dockerfile**
```bash
scp -i ~/.ssh/g-cache.pem c:\project-g-cache\pomodify-frontend\Dockerfile ubuntu@3.106.212.47:~/pomodify-frontend/
```

### **Command 3: Upload nginx.conf**
```bash
scp -i ~/.ssh/g-cache.pem c:\project-g-cache\pomodify-frontend\nginx.conf ubuntu@3.106.212.47:~/pomodify-frontend/
```

---

## **5C. Verify files uploaded**

**Back on EC2, run:**

```bash
ls -la ~/pomodify-frontend/
```

You should see:
```
total 24
drwxrwxr-x  4 ubuntu ubuntu 4096 Nov 29 12:00 .
drwxr-xr-x 18 ubuntu ubuntu 4096 Nov 29 12:00 ..
-rw-r--r--  1 ubuntu ubuntu  248 Nov 29 12:00 Dockerfile
-rw-r--r--  1 ubuntu ubuntu 2500 Nov 29 12:00 nginx.conf
drwxr-xr-x  3 ubuntu ubuntu 4096 Nov 29 12:00 browser
```

---

## **5D. Build Docker image on EC2**

**On EC2, run:**

```bash
cd ~/pomodify-frontend
docker build -t pomodify-frontend .
```

Wait for it to complete (should be ~5-10 seconds).

---

## **5E. Stop old container (if exists)**

```bash
docker stop pomodify-frontend || true
docker rm pomodify-frontend || true
```

---

## **5F. Run container on EC2**

```bash
docker run -d \
  --name pomodify-frontend \
  -p 3000:80 \
  pomodify-frontend
```

Verify it's running:

```bash
docker ps
```

You should see:
```
0.0.0.0:3000->80/tcp   pomodify-frontend
```

---

## **5G. Test with IP address**

Open in your browser:
```
http://3.106.212.47:3000
```

✅ **If you see your app → Step 5 is done!**

---

---

# 📌 **STEP 6 — CONFIGURE NGINX REVERSE PROXY**

This makes your domain (`pomodify.site`) point to your frontend container running on port 3000.

---

## **6A. Create NGINX config file**

**On EC2, run:**

```bash
sudo nano /etc/nginx/sites-available/pomodify-frontend.conf
```

**Paste this exact content:**

```nginx
upstream pomodify_frontend {
    server 127.0.0.1:3000;
}

server {
    server_name pomodify.site www.pomodify.site;

    location / {
        proxy_pass http://pomodify_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**To save and exit:**
- Press `CTRL + O` (save)
- Press `Enter` (confirm filename)
- Press `CTRL + X` (exit nano)

---

## **6B. Enable the site**

```bash
sudo ln -sf /etc/nginx/sites-available/pomodify-frontend.conf /etc/nginx/sites-enabled/
```

---

## **6C. Test NGINX config**

```bash
sudo nginx -t
```

You should see:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## **6D. Reload NGINX**

```bash
sudo systemctl reload nginx
```

---

## **6E. Test with domain**

Open in browser:
```
http://pomodify.site
```

✅ **If you see your app → Step 6 is done!**

---

---

# 🔐 **STEP 7 — APPLY SSL WITH CERTBOT (OPTIONAL BUT RECOMMENDED)**

This makes your domain HTTPS.

```bash
sudo certbot --nginx -d pomodify.site -d www.pomodify.site
```

Follow the prompts:
1. Enter your email
2. Agree to terms (A)
3. Choose redirect (2 = redirect HTTP to HTTPS)

---

## ✅ **Done!**

Your frontend is now live at:
- **HTTP:** http://pomodify.site
- **HTTPS:** https://pomodify.site (if you ran Step 7)
- **IP test:** http://3.106.212.47:3000

---

## 📋 **Troubleshooting**

### **Container not running?**
```bash
docker logs pomodify-frontend
```

### **NGINX errors?**
```bash
sudo nginx -t
sudo systemctl status nginx
```

### **Can't see your app?**
1. Check security group allows port 80, 443, 3000
2. Check DNS points to your EC2 IP
3. Check container is running: `docker ps`
4. Check NGINX is running: `sudo systemctl status nginx`

---

## 🛑 **Common Commands**

```bash
# SSH into EC2
ssh -i ~/.ssh/g-cache.pem ubuntu@3.106.212.47

# Check docker container
docker ps
docker logs pomodify-frontend

# Check NGINX
sudo systemctl status nginx
sudo systemctl restart nginx

# View NGINX config
sudo cat /etc/nginx/sites-enabled/pomodify-frontend.conf

# Update backend API URL (if needed)
# Edit: ~/pomodify-frontend/browser/main-*.js
```

---

**You got this! 🚀**
