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
    console.log('Error checking login state, defaulting to true:', error);
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
    console.error('Error setting login state:', error);
  }
}

// Listen for messages from the main app to sync login state
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SET_LOGIN_STATE') {
    setLoginState(event.data.isLoggedIn);
    console.log('Login state updated to:', event.data.isLoggedIn);
  }
  
  // Allow skipWaiting to activate new service worker immediately
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate immediately and claim all clients
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Helper function to display notification
async function showNotification(title, body, data = {}) {
  const notificationOptions = {
    body: body,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    tag: 'pomodify-timer-' + Date.now(), // Unique tag to ensure new notifications show
    requireInteraction: true,
    renotify: true,
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
      ...data
    }
  };

  try {
    await self.registration.showNotification(title, notificationOptions);
    console.log('Notification displayed:', title);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Handle push events DIRECTLY (this is the key for mobile background notifications)
self.addEventListener('push', async (event) => {
  console.log('Push event received:', event);
  
  // Prevent the browser from handling this automatically
  event.waitUntil((async () => {
    // Check if user is logged in before showing notification
    const isLoggedIn = await getLoginState();
    if (!isLoggedIn) {
      console.log('User not logged in - suppressing notification');
      return;
    }

    let title = 'Pomodify';
    let body = 'You have a notification';
    let data = {};

    if (event.data) {
      try {
        const payload = event.data.json();
        console.log('Push payload:', payload);
        
        // FCM can send data in different formats
        title = payload.notification?.title || payload.data?.title || title;
        body = payload.notification?.body || payload.data?.body || body;
        data = payload.data || {};
      } catch (e) {
        // If not JSON, try text
        const text = event.data.text();
        console.log('Push text:', text);
        body = text || body;
      }
    }

    await showNotification(title, body, data);
  })());
});

// Handle background messages from Firebase (backup handler)
messaging.onBackgroundMessage(async (payload) => {
  console.log('onBackgroundMessage received:', payload);
  
  // Check if user is logged in before showing notification
  const isLoggedIn = await getLoginState();
  if (!isLoggedIn) {
    console.log('User not logged in - suppressing background notification');
    return;
  }
  
  const title = payload.notification?.title || 'Pomodify';
  const body = payload.notification?.body || 'Session update';
  
  await showNotification(title, body, payload.data);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
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
  console.log('Notification closed:', event.notification.tag);
});