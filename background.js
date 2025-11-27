/** @format */

// Background service worker for managing badge and notifications

console.log("[Background] Service worker started");

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("[Background] Message received:", message.type, "from tab:", sender.tab?.id);

	if (message.type === "UPDATE_BADGE") {
		console.log("[Background] Updating badge to:", message.count);
		updateBadge(message.count);
	} else if (message.type === "NEW_NOTIFICATION") {
		console.log("[Background] New notifications received:", message.notifications);

		// Filter only new-projects notifications
		const newProjects = message.notifications.filter((n) => n.category === "new-projects");

		if (newProjects.length === 0) {
			console.log("[Background] No new-projects notifications to display");
			return;
		}

		// Store all notifications for reference
		chrome.storage.local.set({
			allNotifications: message.notifications,
			newProjectsNotifications: newProjects,
			notificationTimestamp: Date.now()
		});

		// Get the active tab and send notification only to it
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length === 0) {
				console.log("[Background] No active tab found");
				return;
			}

			const activeTab = tabs[0];

			// Don't send to codeable.io tab
			if (activeTab.url.includes("app.codeable.io")) {
				console.log("[Background] Active tab is Codeable - not showing notification");
				return;
			}

			console.log(
				`[Background] Sending ${newProjects.length} new-projects notifications to active tab ${activeTab.id}: ${activeTab.url}`
			);

			chrome.tabs
				.sendMessage(activeTab.id, {
					type: "SHOW_NOTIFICATIONS",
					notifications: newProjects
				})
				.catch((error) => {
					console.log(`[Background] Could not send to tab ${activeTab.id}:`, error.message);
				});
		});
	}
});

// Update badge with notification count (global - shows on all tabs)
function updateBadge(count) {
	console.log(`[Background] Setting badge text to: ${count} globally`);
	if (count > 0) {
		chrome.action.setBadgeText({ text: count.toString() });
		chrome.action.setBadgeBackgroundColor({ color: "#165260" });
		chrome.action.setTitle({
			title: `${count} unread notification${count > 1 ? "s" : ""}`
		});
	} else {
		clearBadge();
	}
}

// Clear badge (global - clears on all tabs)
function clearBadge() {
	console.log(`[Background] Clearing badge globally`);
	chrome.action.setBadgeText({ text: "" });
	chrome.action.setTitle({ title: "Codeable Notifications" });
}

// Listen for tab updates to ensure badge is shown on codeable.io tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url && tab.url.includes("app.codeable.io")) {
		console.log(`[Background] Codeable tab loaded: ${tabId}, requesting initial check`);
		// Request initial check from the content script
		chrome.tabs.sendMessage(tabId, { type: "REQUEST_INITIAL_CHECK" }).catch(() => {});
	}
});

// When extension first loads, check for existing notifications
chrome.runtime.onInstalled.addListener(() => {
	console.log("[Background] Extension installed/updated - checking for Codeable tabs");
	chrome.tabs.query({ url: "https://app.codeable.io/*" }, (tabs) => {
		tabs.forEach((tab) => {
			console.log(`[Background] Found Codeable tab ${tab.id}, requesting initial check`);
			chrome.tabs.sendMessage(tab.id, { type: "REQUEST_INITIAL_CHECK" }).catch(() => {});
		});
	});
});
