// Service Worker for background notifications
self.addEventListener('install', event => {
  console.log('Notification Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Notification Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;

  if (action === 'view-call') {
    // Open the call details page
    const callId = notification.tag.split('_')[1];
    const url = `/calls?highlight=${callId}`;
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Try to focus existing window first
        for (const client of clientList) {
          if (client.url.includes('/calls') && 'focus' in client) {
            client.postMessage({ type: 'HIGHLIGHT_CALL', callId });
            return client.focus();
          }
        }
        
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } else if (action === 'dismiss') {
    // Just close the notification
    notification.close();
  } else {
    // Default action - open main app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0 && 'focus' in clientList[0]) {
          return clientList[0].focus();
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }

  notification.close();
});

// Handle background sync for notifications
self.addEventListener('sync', event => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(processNotificationQueue());
  }
});

// Process queued notifications
async function processNotificationQueue() {
  try {
    // Get notifications from IndexedDB or localStorage
    const notifications = await getQueuedNotifications();
    
    for (const notification of notifications) {
      if (shouldSendNotification(notification)) {
        await sendNotification(notification);
        await markNotificationAsSent(notification.id);
      }
    }
  } catch (error) {
    console.error('Failed to process notification queue:', error);
  }
}

// Get queued notifications from IndexedDB
async function getQueuedNotifications() {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readonly');
    const store = transaction.objectStore('notifications');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = request.result;
        const now = new Date();
        
        // Filter for due notifications
        const dueItems = items.filter(item => 
          item.notification.status === 'pending' &&
          new Date(item.notification.scheduledFor) <= now &&
          (!item.nextRetry || new Date(item.nextRetry) <= now)
        );
        
        resolve(dueItems);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get queued notifications:', error);
    return [];
  }
}

// Send a notification
async function sendNotification(notification) {
  const options = {
    body: notification.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: notification.id,
    requireInteraction: notification.priority === 'urgent',
    actions: notification.callId ? [
      {
        action: 'view-call',
        title: 'Visualizza Call'
      },
      {
        action: 'dismiss',
        title: 'Ignora'
      }
    ] : [
      {
        action: 'dismiss',
        title: 'Ignora'
      }
    ],
    data: {
      callId: notification.callId,
      employeeId: notification.employeeId,
      type: notification.type
    }
  };

  return self.registration.showNotification(notification.title, options);
}

// Check if notification should be sent based on quiet hours etc.
function shouldSendNotification(notification) {
  const now = new Date();
  const scheduledFor = new Date(notification.scheduledFor);
  
  // Check if it's time to send
  if (scheduledFor > now) {
    return false;
  }
  
  // Check quiet hours (simplified)
  const hour = now.getHours();
  if (hour >= 22 || hour <= 8) {
    // Skip non-urgent notifications during quiet hours
    return notification.priority === 'urgent';
  }
  
  return true;
}

// Mark notification as sent in IndexedDB
async function markNotificationAsSent(notificationId) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    const getRequest = store.get(notificationId);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.notification.status = 'sent';
          item.notification.sentAt = new Date();
          
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Item not found, nothing to update
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Failed to mark notification as sent:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SCHEDULE_NOTIFICATION':
      // Schedule a notification for later
      scheduleNotification(data);
      break;
    case 'CANCEL_NOTIFICATION':
      // Cancel a scheduled notification
      cancelNotification(data.id);
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Open IndexedDB connection
function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hr-tracker-notifications', 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('notifications')) {
        const store = db.createObjectStore('notifications', { keyPath: 'id' });
        store.createIndex('scheduledFor', 'notification.scheduledFor');
        store.createIndex('status', 'notification.status');
        store.createIndex('priority', 'notification.priority');
        store.createIndex('callId', 'notification.callId');
      }
    };
  });
}

// Schedule notification for later delivery
async function scheduleNotification(notificationData) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    const queueItem = {
      id: notificationData.id,
      notification: notificationData,
      retryCount: 0,
      lastAttempt: new Date(),
      nextRetry: new Date(notificationData.scheduledFor)
    };
    
    store.put(queueItem);
    console.log('Scheduled notification:', notificationData.id);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

// Cancel scheduled notification
async function cancelNotification(notificationId) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    const getRequest = store.get(notificationId);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.notification.status = 'cancelled';
        store.put(item);
        console.log('Cancelled notification:', notificationId);
      }
    };
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}