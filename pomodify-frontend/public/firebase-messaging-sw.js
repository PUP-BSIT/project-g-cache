// Firebase Messaging Service Worker
// This handles background push notifications when the tab is closed or not focused

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyBPye4hQJ270_aL4W9v58dM5eT30dFIwrA',
  authDomain: 'pomodify-push.firebaseapp.com',
  projectId: 'pomodify-push',
  storageBucket: 'pomodify-push.firebasestorage.app',
  messagingSenderId: '277030298544',
  appId: '1:277030298544:web:9573252da0f3e8c5512c75'
});

const messaging = firebase.messaging();

// IndexedDB helper to check login state (since service workers can't access localStorage)
const DB_NAME = 'pomodify-sw-db';
const STORE_NAME = 'auth';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getLoginState() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('isLoggedIn');
      
      request.onerror = () => resolve(true); // Default to true if error
      request.onsuccess = () => resolve(request.result !== false);
    });
  } catch (error) {
    return true; // Default to showing notifications if we can't check
  }
}

// Sync login state from main app (called via postMessage)
async function setLoginState(isLoggedIn) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(isLoggedIn, 'isLoggedIn');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    // Silently fail
  }
}

// Listen for messages from the main app to sync login state
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_LOGIN_STATE') {
    setLoginState(event.data.isLoggedIn);
  }
  
  // Allow skipWaiting to activate new service worker immediately
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate immediately and claim all clients
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// CRITICAL: Handle push events for data-only FCM messages
// 
// Backend now sends DATA-ONLY messages (no notification payload) for web push.
// This gives us full control over notification display and prevents duplicates.
// 
// With data-only messages:
// - Browser does NOT auto-show any notification
// - Only this push handler runs and shows the notification
// - We have full control over notification appearance and behavior
self.addEventListener('push', (event) => {
  // We MUST call event.waitUntil with a showNotification promise
  // For data-only messages, if we don't show a notification, nothing happens
  event.waitUntil((async () => {
    try {
      let title = 'Pomodify';
      let body = 'Session update';
      let data = {};
      
      if (event.data) {
        try {
          const payload = event.data.json();
          
          // For data-only messages, title/body are in payload.data
          // For messages with notification payload (legacy), check payload.notification first
          title = payload.notification?.title || payload.data?.title || title;
          body = payload.notification?.body || payload.data?.body || body;
          data = payload.data || {};
        } catch (e) {
          // Try as text - silently handle parse errors
          event.data.text();
        }
      }
      
      // Dedup check - prevent showing same notification twice
      if (!shouldShowNotification(title, body)) {
        return;
      }
      
      // Check login state
      const isLoggedIn = await getLoginState();
      if (!isLoggedIn) {
        return;
      }
      
      // Show exactly ONE notification
      await showNotification(title, body, data);
      
    } catch (error) {
      // Silently handle errors
    }
  })());
});

// Helper function to display notification
async function showNotification(title, body, data = {}) {
  // Determine if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const notificationOptions = {
    body: body,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    tag: 'pomodify-timer-' + Date.now(), // Unique tag to ensure new notifications show
    requireInteraction: true,
    renotify: true,
    // For mobile PWA, use 'default' to trigger system sound
    // For desktop, silent: false allows browser to play sound
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now(),
      playSound: true, // Flag for the app to play sound when opened
      ...data
    }
  };

  try {
    await self.registration.showNotification(title, notificationOptions);
    
    // For desktop browsers, try to play sound via the app if it's open
    // This is a fallback since service workers can't play audio directly
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        soundType: data.soundType || 'bell'
      });
    }
  } catch (error) {
    // Silently handle notification errors
  }
}

// Track recently shown notifications to prevent duplicates
// Key: notification content hash, Value: timestamp
const recentNotifications = new Map();
const NOTIFICATION_DEDUP_WINDOW_MS = 5000; // 5 second window to dedupe

function getNotificationHash(title, body) {
  return `${title}::${body}`;
}

function shouldShowNotification(title, body) {
  const hash = getNotificationHash(title, body);
  const now = Date.now();
  
  // Clean up old entries
  for (const [key, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > NOTIFICATION_DEDUP_WINDOW_MS) {
      recentNotifications.delete(key);
    }
  }
  
  // Check if we've shown this notification recently
  if (recentNotifications.has(hash)) {
    return false;
  }
  
  // Mark as shown
  recentNotifications.set(hash, now);
  return true;
}

// Handle background messages from Firebase
// NOTE: We handle all notifications in the 'push' event listener above.
// This handler is kept for compatibility purposes only.
// It should NOT show any notifications to avoid duplicates.
messaging.onBackgroundMessage(async (payload) => {
  // Do NOT show notification here - it's already handled by the push event listener
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return; // Just close
  }
  
  // Open or focus the app
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Notification closed - no action needed
});