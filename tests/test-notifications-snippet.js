/** @format */

// IMPROVED TEST NOTIFICATIONS SNIPPET
// Run this in DevTools → Sources → Snippets or paste directly in Console
// Right-click snippet → "Run" or press Ctrl+Enter

// Check if test is already set up
if (window.__codeableTestSetup) {
	console.log("⚠️ Test is already running! To reset, reload the page and run again.");
	console.log("💡 Or run this in console to force reset: delete window.__codeableTestSetup; then run snippet again.");
	throw new Error("Test already setup - reload page to reset");
}

console.log("🧪 Setting up test notifications for Codeable extension...");

// Step 1: Clean up any existing test popover
function cleanupOldPopover() {
	const oldPopover = document.querySelector(".test-popover-notifications");
	if (oldPopover) {
		oldPopover.remove();
		console.log("🧹 Removed old test popover");
	}
}

// Step 2: Create mock popover structure
function createMockPopover() {
	const popover = document.createElement("div");
	popover.className = "popover-content popover-notifications-widget test-popover-notifications";
	popover.style.cssText =
		"display: none; position: fixed; top: 100px; right: 20px; background: white; border: 1px solid #ccc; padding: 20px; z-index: 99999; box-shadow: 0 2px 10px rgba(0,0,0,0.1);";

	const listWrapper = document.createElement("div");
	listWrapper.className = "notifications-list-wrapper";

	// Create test notifications: 2 unread + 1 read
	const notifications = [
		{
			id: 1,
			text: "Test Notification 1: New WordPress project posted - Need help with e-commerce integration",
			isRead: false
		},
		{
			id: 2,
			text: "Test Notification 2: Client responded to your proposal for custom theme development",
			isRead: false
		},
		{
			id: 3,
			text: "Test Notification 3: This notification was already read and should be ignored by the extension",
			isRead: true
		}
	];

	notifications.forEach((notif) => {
		const item = document.createElement("cdbl-notification-item");

		const wrapper = document.createElement("div");
		wrapper.className = "notification-wrapper";
		if (notif.isRead) {
			wrapper.classList.add("notification--isRead");
		}

		const link = document.createElement("a");
		link.href = `tasks/99999${notif.id}`;

		const message = document.createElement("div");
		message.className = "notification__message";
		message.textContent = notif.text;

		link.appendChild(message);
		wrapper.appendChild(link);
		item.appendChild(wrapper);
		listWrapper.appendChild(item);
	});

	popover.appendChild(listWrapper);
	document.body.appendChild(popover);

	console.log("✅ Created mock popover structure with 2 unread + 1 read notification");
	return popover;
}

// Step 3: Make notification indicators visible
function makeIndicatorsVisible() {
	const widgets = document.querySelectorAll("cdbl-notifications-widget");
	let visibleCount = 0;

	widgets.forEach((widget, index) => {
		let indicator = widget.querySelector("span.notifications-indicator");

		if (indicator) {
			// Make it visible with count of 2 (matching our test notifications)
			indicator.style.display = "block";
			visibleCount++;

			const categoryName = widget.getAttribute("category-name");
			console.log(`✅ Made ${categoryName} indicator visible (count: 2)`);
		} else {
			console.log(`⚠️ No indicator found in widget ${index}`);
		}
	});

	console.log(`✅ Made ${visibleCount} indicators visible`);
	return visibleCount;
}

// Step 4: Setup click handlers to toggle popover
function setupClickHandlers(popover) {
	const widgets = document.querySelectorAll("cdbl-notifications-widget");

	widgets.forEach((widget) => {
		// Clone widget to remove existing event listeners
		const clone = widget.cloneNode(true);
		widget.parentNode.replaceChild(clone, widget);

		// Add new click handler that toggles popover
		clone.addEventListener(
			"click",
			function (e) {
				const categoryName = clone.getAttribute("category-name");
				console.log(`🖱️ Widget clicked: ${categoryName}`);

				// Toggle popover visibility
				if (popover.style.display === "none" || popover.style.display === "") {
					popover.style.display = "block";
					console.log(`  → Popover shown`);
				} else {
					popover.style.display = "none";
					console.log(`  → Popover hidden`);
				}
			},
			true
		);
	});

	console.log("✅ Click handlers set up on all widgets");
}

// Run the setup
function runTestSetup() {
	cleanupOldPopover();
	const popover = createMockPopover();
	const indicatorCount = makeIndicatorsVisible();
	setupClickHandlers(popover);

	// Mark as setup complete
	window.__codeableTestSetup = true;

	console.log("\n✅ TEST SETUP COMPLETE!");
	console.log(`📊 Total unread notifications: ${indicatorCount * 2} (2 per category × ${indicatorCount} categories)`);
	console.log("💡 Extension will detect these in the next check cycle");
	console.log("💡 Popover toggles on/off with each click (stays visible for extension to read)");
	console.log("\n🎯 What to expect:");
	console.log("  1. Extension badge should show total unread count");
	console.log("  2. Notification popup should appear on other browser tabs");
	console.log("  3. Console will show detection and extraction logs");
	console.log("\n🔄 To reset: Reload the page and run again");
}

// Execute
runTestSetup();
