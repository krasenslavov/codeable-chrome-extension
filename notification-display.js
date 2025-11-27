/** @format */

// Content script for displaying notifications on non-codeable tabs

let notificationElement = null;
const DISMISSED_KEY = "dismissedNotifications";

// Get dismissed notifications from localStorage
function getDismissedNotifications() {
	const dismissed = localStorage.getItem(DISMISSED_KEY);
	return dismissed ? JSON.parse(dismissed) : [];
}

// Save dismissed notification
function dismissNotification(notificationText) {
	const dismissed = getDismissedNotifications();
	if (!dismissed.includes(notificationText)) {
		dismissed.push(notificationText);
		localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
		console.log("[Notification Display] Dismissed:", notificationText.substring(0, 30));
	}
}

// Create notification container
function createNotificationElement() {
	if (notificationElement) {
		return notificationElement;
	}

	const container = document.createElement("div");
	container.id = "codeable-notification-container";
	container.className = "codeable-notification-hidden";

	document.body.appendChild(container);
	notificationElement = container;

	return container;
}

// Show all notifications
function showNotifications(notifications) {
	console.log("[Notification Display] Showing notifications:", notifications);

	const dismissed = getDismissedNotifications();

	// Filter out dismissed notifications
	const unread = notifications.filter((n) => !dismissed.includes(n.text));

	if (unread.length === 0) {
		console.log("[Notification Display] All notifications already dismissed");
		hideNotifications();
		return;
	}

	console.log(`[Notification Display] Showing ${unread.length} unread notifications`);

	const container = createNotificationElement();
	container.innerHTML = ""; // Clear previous content

	// Create notification panel
	const panel = document.createElement("div");
	panel.className = "codeable-notification";

	// Close button for entire panel
	const closeBtn = document.createElement("button");
	closeBtn.className = "codeable-notification-close";
	closeBtn.innerHTML = "&times;";
	closeBtn.addEventListener("click", () => {
		// Dismiss all displayed notifications
		unread.forEach((n) => dismissNotification(n.text));
		hideNotifications();
	});

	// Title
	const title = document.createElement("div");
	title.className = "codeable-notification-title";
	title.textContent = `New Projects (${unread.length})`;

	// Notifications list
	const list = document.createElement("div");
	list.className = "codeable-notification-list";

	unread.forEach((notif) => {
		const item = document.createElement("div");
		item.className = "codeable-notification-item";

		const text = document.createElement("div");
		text.className = "codeable-notification-message";
		text.textContent = notif.text;

		item.appendChild(text);

		if (notif.link) {
			const link = document.createElement("a");
			link.className = "codeable-notification-link";
			link.textContent = "View Project →";
			link.target = "_blank";
			link.href = notif.link.startsWith("http")
				? notif.link
				: `https://app.codeable.io${notif.link}`;

			item.appendChild(link);
		}

		list.appendChild(item);
	});

	panel.appendChild(closeBtn);
	panel.appendChild(title);
	panel.appendChild(list);
	container.appendChild(panel);

	// Show container
	container.classList.remove("codeable-notification-hidden");
	container.classList.add("codeable-notification-visible");
	console.log("[Notification Display] Notifications displayed");
}

// Hide notifications
function hideNotifications() {
	console.log("[Notification Display] Hiding notifications");
	if (notificationElement) {
		notificationElement.classList.remove("codeable-notification-visible");
		notificationElement.classList.add("codeable-notification-hidden");
	}
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("[Notification Display] Message received:", message);
	if (message.type === "SHOW_NOTIFICATIONS") {
		showNotifications(message.notifications);
	} else if (message.type === "CLEAR_NOTIFICATION") {
		hideNotifications();
	}
});

// Check for existing notifications on load
chrome.storage.local.get(["allNotifications", "notificationTimestamp"], (result) => {
	console.log("[Notification Display] Extension loaded, checking for existing notifications");
	if (result.allNotifications && result.allNotifications.length > 0) {
		const age = Date.now() - result.notificationTimestamp;
		console.log(`[Notification Display] Found ${result.allNotifications.length} notifications ${age}ms old - displaying them`);
		showNotifications(result.allNotifications);
	}
});
