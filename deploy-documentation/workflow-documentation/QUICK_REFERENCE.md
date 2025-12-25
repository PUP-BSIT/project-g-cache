# ⚡ QUICK COPY-PASTE COMMANDS

## **📌 STEP 5 — ON YOUR LAPTOP**

```bash
# Command 1: Upload dist folder
scp -i ~/.ssh/g-cache.pem -r c:\project-g-cache\pomodify-frontend\dist\pomodify-frontend\browser ubuntu@3.106.212.47:~/pomodify-frontend/

# Command 2: Upload Dockerfile
scp -i ~/.ssh/g-cache.pem c:\project-g-cache\pomodify-frontend\Dockerfile ubuntu@3.106.212.47:~/pomodify-frontend/

# Command 3: Upload nginx.conf
scp -i ~/.ssh/g-cache.pem c:\project-g-cache\pomodify-frontend\nginx.conf ubuntu@3.106.212.47:~/pomodify-frontend/
```

---

## **📌 STEP 5 — ON EC2 (SSH)**

```bash
# SSH into EC2
ssh -i ~/.ssh/g-cache.pem ubuntu@3.106.212.47

# Create directory
mkdir -p ~/pomodify-frontend
cd ~/pomodify-frontend

# Verify files
ls -la

# Build Docker image
docker build -t pomodify-frontend .

# Stop old container
docker stop pomodify-frontend || true
docker rm pomodify-frontend || true

# Run container
docker run -d --name pomodify-frontend -p 3000:80 pomodify-frontend

# Check if running
docker ps

# Test: Open http://3.106.212.47:3000
```

---

## **📌 STEP 6 — ON EC2 (NGINX SETUP)**

```bash
# Create NGINX config
sudo nano /etc/nginx/sites-available/pomodify-frontend.conf
```

**Paste this inside nano:**
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

**Save & exit:**
- `CTRL + O`
- `Enter`
- `CTRL + X`

**Then continue:**
```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/pomodify-frontend.conf /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Test: Open http://pomodify.site
```

---

## **📌 STEP 7 — SSL CERTIFICATE (OPTIONAL)**

```bash
sudo certbot --nginx -d pomodify.site -d www.pomodify.site
```

Choose option `2` when asked to redirect HTTP to HTTPS.

---

## **✅ FINAL TEST**

```
http://pomodify.site           → Should work
https://pomodify.site          → Should work (after SSL)
http://3.106.212.47:3000       → Should work
```

---

**That's it! You're live! 🚀**
