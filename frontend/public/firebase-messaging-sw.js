importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDOOpAtqg4zlKkxcB4klaexxYymUh4UNL0",
  authDomain: "atleast80-e5223.firebaseapp.com",
  projectId: "atleast80-e5223",
  storageBucket: "atleast80-e5223.firebasestorage.app",
  messagingSenderId: "617955288716",
  appId: "1:617955288716:web:acd1cbeca135ca09fe7da9",
  measurementId: "G-Y76FH0JGVJ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Atleast80 Update';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification.',
    icon: '/logo.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
