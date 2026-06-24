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
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.svg",
    badge: "/favicon.svg",
    color: "#0252e3", // momentum blue brand accent
    vibrate: [100, 50, 100],
    actions: [
      {
        action: "open-chat",
        title: "Open Chat 💬"
      },
      {
        action: "dismiss",
        title: "Dismiss ❌"
      }
    ],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle clicking the native notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // If user clicked the dismiss button, do nothing further
  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

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
