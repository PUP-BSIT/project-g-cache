# Simple serve stage - uses pre-built dist folder
FROM nginx:alpine
COPY dist/pomodify-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
