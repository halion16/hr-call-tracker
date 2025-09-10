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

// Get queued notifications (placeholder)
async function getQueuedNotifications() {
  // In a real implementation, this would read from IndexedDB
  return [];
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

// Mark notification as sent (placeholder)
async function markNotificationAsSent(notificationId) {
  // In a real implementation, this would update IndexedDB
  console.log('Marked notification as sent:', notificationId);
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

// Schedule notification for later delivery
function scheduleNotification(notificationData) {
  // In a real implementation, this would store in IndexedDB
  console.log('Scheduled notification:', notificationData);
}

// Cancel scheduled notification
function cancelNotification(notificationId) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Cancelled notification:', notificationId);
}