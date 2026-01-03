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
});

// Handle background messages
messaging.onBackgroundMessage(async (payload) => {
  console.log('Background message received:', payload);
  
  // Check if user is logged in before showing notification
  const isLoggedIn = await getLoginState();
  if (!isLoggedIn) {
    console.log('User not logged in - suppressing background notification');
    return;
  }
  
  const notificationTitle = payload.notification?.title || 'Pomodify';
  const notificationOptions = {
    body: payload.notification?.body || 'Session completed!',
    icon: '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    tag: 'pomodify-session',
    requireInteraction: true,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'View Session'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      url: '/',
      sessionId: payload.data?.sessionId,
      activityId: payload.data?.activityId,
      sound: payload.data?.sound || 'default'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Open or focus the app
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if app is not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
  // If action is 'dismiss', just close the notification (already done above)
});

// Handle push events (for additional processing if needed)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    // Additional processing can be done here
    // The onBackgroundMessage handler above will handle the notification display
    
  } catch (error) {
    console.error('Error parsing push data:', error);
  }
});