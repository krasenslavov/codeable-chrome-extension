/** @format */

// Content script for monitoring notifications on app.codeable.io

let previousCount = 0;
let previousNotifications = [];
let checkInterval = null;
let originalFavicon = null;
let faviconLink = null;
// Initialize based on actual tab visibility state
let isTabFocused = !document.hidden;

// Helper function to safely send messages to background
function safeSendMessage(message) {
	try {
		chrome.runtime.sendMessage(message);
	} catch (error) {
		if (error.message.includes("Extension context invalidated")) {
			console.warn("[Codeable Monitor] Extension reloaded - please refresh the page");
			// Stop the interval to prevent repeated errors
			if (checkInterval) {
				clearInterval(checkInterval);
				checkInterval = null;
			}
		} else {
			console.error("[Codeable Monitor] Error sending message:", error);
		}
	}
}

// Initialize monitoring
function init() {
	console.log("[Codeable Monitor] Extension loaded and monitoring started");

	// Start checking every 60 seconds
	checkInterval = setInterval(checkNotifications, 60000);

	// Initial check immediately on load
	console.log("[Codeable Monitor] Running initial check...");
	checkNotifications(true);

	// Listen for requests from background script
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.type === "REQUEST_INITIAL_CHECK") {
			console.log("[Codeable Monitor] Initial check requested by background - forcing check");
			// Force check even if tab is focused (for initial load)
			checkNotifications(true);
		}
	});
}

// Helper function to wait for an element to appear
function waitForElement(selector, timeout = 5000) {
	return new Promise((resolve) => {
		// Check if element already exists
		const existing = document.querySelector(selector);
		if (existing) {
			resolve(existing);
			return;
		}

		// Set up polling
		const startTime = Date.now();
		const interval = setInterval(() => {
			const element = document.querySelector(selector);
			if (element) {
				clearInterval(interval);
				resolve(element);
			} else if (Date.now() - startTime >= timeout) {
				clearInterval(interval);
				resolve(null); // Timeout - return null
			}
		}, 100); // Check every 100ms
	});
}

// Check for notifications
async function checkNotifications(forceCheck = false) {
	try {
		// Only check notifications when tab is in background (not focused)
		// This prevents disrupting the user while they're actively on the Codeable page
		// Exception: when explicitly requested by background (forceCheck=true)
		if (!forceCheck && !document.hidden && isTabFocused) {
			console.log("[Codeable Monitor] Tab is focused - skipping check to avoid disruption");
			return;
		}

		console.log("[Codeable Monitor] Checking for notifications..." + (forceCheck ? " (forced)" : ""));

		// Only monitor new-projects category
		const widgets = [
			{
				element: document.querySelector("cdbl-notifications-widget[category-name=\"'new-projects'\"]"),
				category: "new-projects"
			}
		].filter((w) => w.element !== null);

		console.log(`[Codeable Monitor] Found ${widgets.length} widgets`);

		if (widgets.length === 0) {
			// Widgets not loaded yet
			console.log("[Codeable Monitor] No widgets found yet, waiting...");
			return;
		}

		let totalCount = 0;
		let allNotifications = [];

		// Check each widget for notifications
		for (const widget of widgets) {
			console.log(`[Codeable Monitor] Checking ${widget.category} widget`);

			// Find the trigger button INSIDE the widget and click it
			const trigger = widget.element.querySelector(".notifications-widget-trigger");

			if (!trigger) {
				console.warn(`[Codeable Monitor] No trigger found for ${widget.category}`);
				continue;
			}

			// Click the trigger to open the popover
			trigger.click();

			// Wait for popover to appear (with retry logic)
			const popover = await waitForElement(".popover-content.popover-notifications-widget", 5000);
			console.log(`[Codeable Monitor] Popover found: ${popover !== null}`);

			// Hide the popover completely (so user doesn't see it)
			let originalOpacity = "";
			if (popover) {
				originalOpacity = popover.style.opacity;
				popover.style.opacity = 0;
			}

			if (popover) {
				const notificationsList = popover.querySelector(".notifications-list-wrapper");
				console.log(`[Codeable Monitor] Notifications list found: ${notificationsList !== null}`);

				if (notificationsList) {
					// Get all notification items
					const notificationItems = notificationsList.querySelectorAll("cdbl-notification-item");
					console.log(`[Codeable Monitor] Total notification items: ${notificationItems.length}`);

					// Filter only unread notifications (without .notification--isRead)
					const unreadNotifications = Array.from(notificationItems).filter((item) => {
						const wrapper = item.querySelector(".notification-wrapper");
						return wrapper && !wrapper.classList.contains("notification--isRead");
					});

					const categoryCount = unreadNotifications.length;
					console.log(`[Codeable Monitor] ${widget.category} unread count: ${categoryCount}`);

					if (categoryCount > 0) {
						totalCount += categoryCount;

						// Extract ALL unread notification details
						unreadNotifications.forEach((item) => {
							const notificationWrapper = item.querySelector(".notification-wrapper");

							if (notificationWrapper) {
								// The notification-wrapper itself IS the <a> tag
								const link = notificationWrapper.tagName === "A" ? notificationWrapper.getAttribute("href") : null;
								const messageEl = notificationWrapper.querySelector(".notification__message");

								if (messageEl) {
									// Strip HTML tags and get text content
									const textContent = messageEl.textContent.trim();

									allNotifications.push({
										category: widget.category,
										text: textContent,
										link: link,
										timestamp: Date.now()
									});
								}
							}
						});

						console.log(`[Codeable Monitor] Extracted ${allNotifications.length} unread notifications`);
					}
				}

				// Restore popover display before closing
				popover.style.opacity = originalOpacity;

				// Close popover by clicking the trigger again
				trigger.click();

				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		console.log(`[Codeable Monitor] Total unread count: ${totalCount} (previous: ${previousCount})`);

		// Update badge if count changed
		if (totalCount !== previousCount) {
			console.log(`[Codeable Monitor] Sending badge update: ${totalCount}`);
			safeSendMessage({
				type: "UPDATE_BADGE",
				count: totalCount
			});

			// Update favicon
			updateFavicon(totalCount);

			previousCount = totalCount;
		}

		// Check for new notifications by comparing arrays
		const hasNewNotification = allNotifications.some((notif) => {
			return !previousNotifications.some((prev) => prev.text === notif.text);
		});

		console.log(`[Codeable Monitor] Has new notification: ${hasNewNotification}`);

		if (hasNewNotification && allNotifications.length > 0) {
			// Send ALL notifications to other tabs
			console.log(`[Codeable Monitor] Sending ${allNotifications.length} notifications to background`);
			safeSendMessage({
				type: "NEW_NOTIFICATION",
				notifications: allNotifications // Send array of all notifications
			});
		}

		previousNotifications = allNotifications;
	} catch (error) {
		console.error("[Codeable Monitor] Error checking notifications:", error);
	}
}

// Favicon notification functions
function saveFavicon() {
	if (!faviconLink) {
		// Try to find the main browser tab favicon (try multiple selectors)
		faviconLink =
			document.querySelector("link[rel='icon'][sizes='32x32']") ||
			document.querySelector("link[rel='icon'][sizes='16x16']") ||
			document.querySelector("link[rel='shortcut icon']") ||
			document.querySelector("link[rel='icon']");

		if (faviconLink) {
			originalFavicon = faviconLink.href;
			console.log("[Codeable Monitor] Original favicon saved:", originalFavicon);
		} else {
			console.warn("[Codeable Monitor] No favicon link found!");
		}
	}
}

function createNotificationFavicon(count) {
	const canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32;
	const ctx = canvas.getContext("2d");

	// Draw dark circle background
	ctx.fillStyle = "#165260";
	ctx.beginPath();
	ctx.arc(16, 16, 15, 0, 2 * Math.PI);
	ctx.fill();

	// Draw white border for better visibility
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 2;
	ctx.stroke();

	// Draw white text (count) with shadow for better visibility
	ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
	ctx.shadowBlur = 2;
	ctx.shadowOffsetX = 1;
	ctx.shadowOffsetY = 1;
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "bold 24px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const text = count > 99 ? "99" : count.toString();
	ctx.fillText(text, 16, 17);

	return canvas.toDataURL();
}

function updateFavicon(count) {
	saveFavicon();

	console.log(`[Codeable Monitor] updateFavicon: count=${count}`);

	if (!faviconLink) {
		console.warn("[Codeable Monitor] No favicon link found");
		return;
	}

	// Show notification favicon when count > 0, restore original when count = 0
	// Badge and favicon will reset naturally when platform detects mark-as-read
	if (count > 0) {
		const notificationFavicon = createNotificationFavicon(count);
		faviconLink.href = notificationFavicon;
		console.log(`[Codeable Monitor] Favicon updated with count: ${count}`);
	} else {
		if (originalFavicon) {
			faviconLink.href = originalFavicon;
			console.log(`[Codeable Monitor] Favicon restored to original (count: ${count})`);
		}
	}
}

// Setup tab visibility handlers to track focus state
function setupFocusHandlers() {
	console.log("[Codeable Monitor] Setting up focus handlers...");

	// Use visibilitychange API to track tab visibility
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			// Tab is now hidden (blurred)
			console.log("[Codeable Monitor] Tab HIDDEN");
			isTabFocused = false;
		} else {
			// Tab is now visible (focused)
			console.log("[Codeable Monitor] Tab VISIBLE");
			isTabFocused = true;
		}
	});

	// Also add window focus/blur as backup
	window.addEventListener("focus", () => {
		console.log("[Codeable Monitor] Window FOCUSED");
		isTabFocused = true;
	});

	window.addEventListener("blur", () => {
		console.log("[Codeable Monitor] Window BLURRED");
		isTabFocused = false;
	});

	console.log("[Codeable Monitor] ✅ Tab focus handlers set up");
}

// Start monitoring when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		init();
		setupFocusHandlers();
	});
} else {
	init();
	setupFocusHandlers();
}

// Cleanup on unload
window.addEventListener("beforeunload", () => {
	if (checkInterval) {
		clearInterval(checkInterval);
	}
});
