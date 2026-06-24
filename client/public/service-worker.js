// Browser Service Worker for Background Tasks Alerts
self.addEventListener("push", (event) => {
  let data = {
    title: "Reminder",
    body: "A scheduled task starts now!",
    icon: "/favicon.svg"
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Fallback if not JSON string
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.svg",
    badge: "/favicon.svg", // small icon displayed in the status bar
    vibrate: [100, 50, 100],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle clicking the native notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  // Check if target tab is already open and focus it, otherwise open new window
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.host) && "focus" in client) {
          return client.focus().then((fClient) => {
            if ("navigate" in fClient) {
              return fClient.navigate(targetUrl);
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
