// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Pomodify';
  const notificationOptions = {
    body: payload.notification?.body || 'Timer completed!',
    icon: '/assets/images/logo.png',
    tag: 'pomodify-notification',
    requireInteraction: true,
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});
