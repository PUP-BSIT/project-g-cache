// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyDLBKBLDKOqfVPvq2341fnWICTKoYdq2ug',
  authDomain: 'pomodify-6c0a2.firebaseapp.com',
  projectId: 'pomodify-6c0a2',
  storageBucket: 'pomodify-6c0a2.firebasestorage.app',
  messagingSenderId: '365855742398',
  appId: '1:365855742398:web:c18205d516663707a781ef'
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
