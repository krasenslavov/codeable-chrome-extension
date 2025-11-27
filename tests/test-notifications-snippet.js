/** @format */

// TEST NOTIFICATIONS SNIPPET - Updated to match real Codeable structure
// Run this in DevTools → Sources → Snippets or paste directly in Console

// Check if test is already set up
if (window.__codeableTestSetup) {
	console.log("⚠️ Test is already running! To reset, reload the page and run again.");
	console.log("💡 Or run: delete window.__codeableTestSetup; then run snippet again.");
	throw new Error("Test already setup - reload page to reset");
}

console.log("🧪 Setting up test notifications for Codeable extension...");

// Clean up any existing test popover
function cleanupOldPopover() {
	const oldPopover = document.querySelector(".test-popover-notifications");
	if (oldPopover) {
		oldPopover.remove();
		console.log("🧹 Removed old test popover");
	}
}

// Create mock popover with REAL Codeable structure
function createMockPopover() {
	const popover = document.createElement("div");
	popover.className = "popover-content popover-notifications-widget test-popover-notifications";
	popover.style.cssText = "display: none; position: fixed; top: 100px; right: 20px; background: white; border: 1px solid #ccc; padding: 20px; z-index: 99999; box-shadow: 0 2px 10px rgba(0,0,0,0.1);";

	const listWrapper = document.createElement("div");
	listWrapper.className = "notifications-list-wrapper";

	// Create test notifications matching REAL structure
	const notifications = [
		{
			id: 212691,
			user: "John D.",
			action: "posted",
			title: "WordPress Plugin Customization",
			isRead: false
		},
		{
			id: 212692,
			user: "Sarah M.",
			action: "responded to your proposal for",
			title: "E-commerce Site Development",
			isRead: false
		},
		{
			id: 212680,
			user: "Mike R.",
			action: "posted",
			title: "WooCommerce Integration Help",
			isRead: true // This one is read - should be ignored
		}
	];

	notifications.forEach((notif) => {
		const item = document.createElement("cdbl-notification-item");

		// The <a> tag IS the notification-wrapper (not a div!)
		const wrapper = document.createElement("a");
		wrapper.className = "notification-wrapper";
		wrapper.href = `/tasks/${notif.id}`;

		if (notif.isRead) {
			wrapper.classList.add("notification--isRead");
		}

		// Create message structure
		const content = document.createElement("div");
		content.className = "notification__content";

		const message = document.createElement("div");
		message.className = "notification__message";

		const userName = document.createElement("span");
		userName.className = "notification__user__name";
		userName.textContent = notif.user;

		const projectTitle = document.createElement("span");
		projectTitle.className = "notification__project-title";
		projectTitle.textContent = notif.title;

		message.appendChild(userName);
		message.appendChild(document.createTextNode(` ${notif.action} `));
		message.appendChild(projectTitle);

		content.appendChild(message);
		wrapper.appendChild(content);
		item.appendChild(wrapper);
		listWrapper.appendChild(item);
	});

	popover.appendChild(listWrapper);
	document.body.appendChild(popover);

	console.log("✅ Created mock popover with 2 unread + 1 read notification");
	return popover;
}

// Setup click handlers on the TRIGGER buttons (not the widgets)
function setupClickHandlers(popover) {
	const widgets = document.querySelectorAll("cdbl-notifications-widget");

	widgets.forEach((widget) => {
		// Find the trigger INSIDE the widget
		const trigger = widget.querySelector(".notifications-widget-trigger");

		if (trigger) {
			// Clone to remove existing listeners
			const clone = trigger.cloneNode(true);
			trigger.parentNode.replaceChild(clone, trigger);

			// Add click handler to the TRIGGER
			clone.addEventListener(
				"click",
				function (e) {
					e.preventDefault();
					e.stopPropagation();

					const categoryName = widget.getAttribute("category-name");
					console.log(`🖱️ Trigger clicked: ${categoryName}`);

					// Toggle popover
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

			console.log(`✅ Click handler set on ${widget.getAttribute("category-name")} trigger`);
		} else {
			console.warn(`⚠️ No trigger found in widget ${widget.getAttribute("category-name")}`);
		}
	});
}

// Run the setup
function runTestSetup() {
	cleanupOldPopover();
	const popover = createMockPopover();
	setupClickHandlers(popover);

	// Mark as setup complete
	window.__codeableTestSetup = true;

	console.log("\n✅ TEST SETUP COMPLETE!");
	console.log("📊 Total: 2 unread notifications per category (6 total)");
	console.log("💡 Extension will detect these in the next check cycle (60 seconds)");
	console.log("💡 Or switch to another tab to trigger check immediately");
	console.log("\n🎯 What to expect:");
	console.log("  1. Badge: Shows '6' on extension icon");
	console.log("  2. Favicon: Green circle with '6' when tab is in background");
	console.log("  3. Popup: Notification message on other tabs with 'View Task' link");
	console.log("\n🔄 To reset: Reload the page and run again");
	console.log("\n💡 To clear extension data:");
	console.log("  - Click extension icon on Codeable tab");
	console.log("  - Or run: chrome.storage.local.clear() in background console");
}

// Execute
runTestSetup();
