/** @format */

// Background service worker for managing badge and notifications

console.log("[Background] Service worker started");

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("[Background] Message received:", message.type, "from tab:", sender.tab?.id);

	if (message.type === "UPDATE_BADGE") {
		console.log("[Background] Updating badge to:", message.count);
		updateBadge(message.count, sender.tab.id);
	} else if (message.type === "CLEAR_BADGE") {
		console.log("[Background] Clearing badge");
		// clearBadge(sender.tab.id);
	} else if (message.type === "NEW_NOTIFICATION") {
		console.log("[Background] New notifications received:", message.notifications);

		// Store all notifications and broadcast to other tabs
		chrome.storage.local.set({
			allNotifications: message.notifications,
			notificationTimestamp: Date.now()
		});

		// Broadcast to all tabs except codeable.io
		chrome.tabs.query({}, (tabs) => {
			console.log(`[Background] Broadcasting ${message.notifications.length} notifications to ${tabs.length} tabs`);
			tabs.forEach((tab) => {
				if (tab.id !== sender.tab.id && !tab.url.includes("app.codeable.io")) {
					console.log(`[Background] Sending notifications to tab ${tab.id}: ${tab.url}`);
					chrome.tabs
						.sendMessage(tab.id, {
							type: "SHOW_NOTIFICATIONS",
							notifications: message.notifications
						})
						.catch((error) => {
							console.log(`[Background] Could not send to tab ${tab.id}:`, error.message);
						});
				}
			});
		});
	}
});

// Update badge with notification count (global - shows on all tabs)
function updateBadge(count, tabId) {
	console.log(`[Background] Setting badge text to: ${count} globally (triggered from tab: ${tabId})`);
	if (count > 0) {
		chrome.action.setBadgeText({ text: count.toString() });
		chrome.action.setBadgeBackgroundColor({ color: "#242628" });
		chrome.action.setTitle({
			title: `${count} notification${count > 1 ? "s" : ""}`
		});
	} else {
		// clearBadge();
	}
}

// Clear badge (global - clears on all tabs)
function clearBadge() {
	console.log(`[Background] Clearing badge globally`);
	chrome.action.setBadgeText({ text: "" });
	chrome.action.setTitle({ title: "Codeable Notifications" });
}

// Listen for tab clicks to clear notifications
// chrome.action.onClicked.addListener((tab) => {
// 	console.log(`[Background] Extension icon clicked on tab: ${tab.id}, URL: ${tab.url}`);
// 	if (tab.url.includes("app.codeable.io")) {
// 		console.log("[Background] Clearing all notifications");
// 		// Clear badge and storage
// 		clearBadge();
// 		chrome.storage.local.remove(["latestNotification", "notificationTimestamp"]);

// 		// Clear notifications on all other tabs
// 		chrome.tabs.query({}, (tabs) => {
// 			tabs.forEach((t) => {
// 				if (t.id !== tab.id) {
// 					chrome.tabs
// 						.sendMessage(t.id, {
// 							type: "CLEAR_NOTIFICATION"
// 						})
// 						.catch(() => {});
// 				}
// 			});
// 		});
// 	}
// });

// Listen for tab updates to ensure badge is shown on codeable.io tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url && tab.url.includes("app.codeable.io")) {
		console.log(`[Background] Codeable tab loaded: ${tabId}, requesting count`);
		// Request current count from the content script
		chrome.tabs.sendMessage(tabId, { type: "REQUEST_COUNT" }).catch(() => {});
	}
});
