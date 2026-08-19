// 🧪 QUICK TEST SNIPPETS - Paste in Browser Console

// TEST 1: Check if categories are loading
console.group("📌 Category Loading Test");
fetch('http://127.0.0.1:8000/api/subcategories')
    .then(r => r.json())
    .then(data => {
        console.log("✅ Categories loaded:", data.length, "categories");
        console.table(data.slice(0, 5)); // Show first 5
    })
    .catch(e => console.error("❌ Failed to load categories:", e));
console.groupEnd();

// TEST 2: Check if admin user role is being received correctly
console.group("🔐 Role Check Test");
const storedUser = JSON.parse(localStorage.getItem('user_details'));
if (storedUser) {
    console.log("Stored user:", storedUser);
    console.log("Role value:", storedUser.role);
    console.log("Role type:", typeof storedUser.role);
    if (typeof storedUser.role === 'object') {
        console.log("Role name:", storedUser.role.name);
    }
} else {
    console.warn("No user stored - not logged in");
}
console.groupEnd();

// TEST 3: Simulate category selection
console.group("🎯 Category Selection Test");
console.log("Simulating category selection event...");
const mockEvent = {
    target: {
        name: 'subcategory_ids',
        value: [1, 2, 3]
    }
};
console.log("Mock event:", mockEvent);
console.log("Extracted value:", mockEvent.target.value);
console.log("Is array?", Array.isArray(mockEvent.target.value));
console.groupEnd();

// TEST 4: Check if admin roles match
console.group("👤 Admin Role Matching Test");
const testRoles = ["admin", "Admin", "ADMIN", "superadmin", "SuperAdmin", "user"];
const adminRolesRef = ["admin", "superadmin", "administrator", "manager", "editor", "librarian", "staff"];

testRoles.forEach(role => {
    const normalized = role.toLowerCase().trim();
    const isAdmin = adminRolesRef.includes(normalized);
    console.log(`"${role}" → "${normalized}" = ${isAdmin ? '✅ ADMIN' : '❌ USER'}`);
});
console.groupEnd();

// TEST 5: Monitor category dropdown interactions
console.group("🔍 Dropdown Event Monitoring");
console.log("Monitoring click events on category dropdown...");

// This needs to be run BEFORE clicking
let clickCount = 0;
document.addEventListener('click', (e) => {
    if (e.target.closest('[aria-haspopup="listbox"]')) {
        clickCount++;
        console.log(`🔽 Dropdown button clicked (${clickCount})`);
        console.log("Button element:", e.target.closest('[aria-haspopup="listbox"]'));
    }
}, true); // Use capture phase

console.log("Listening for category dropdown clicks...");
console.log("(Click the dropdown button and check console)");
console.groupEnd();

// TEST 6: Check localStorage for auth data
console.group("🔑 Auth Data Verification");
const token = localStorage.getItem('access_token');
const user = localStorage.getItem('user_details');
const sessionToken = sessionStorage.getItem('access_token');

console.log("localStorage.access_token:", token ? "✅ Present" : "❌ Missing");
console.log("localStorage.user_details:", user ? "✅ Present" : "❌ Missing");
console.log("sessionStorage.access_token:", sessionToken ? "✅ Present" : "❌ Missing");

if (user) {
    try {
        const userData = JSON.parse(user);
        console.log("User data keys:", Object.keys(userData));
        console.log("Full user object:", userData);
    } catch (e) {
        console.error("Failed to parse user data:", e);
    }
}
console.groupEnd();

// TEST 7: Simulate login response
console.group("✅ Login Response Simulation");
const mockLoginResponse = {
    access_token: "mock_token_xxx",
    user: {
        id: 1,
        username: "admin",
        full_name: "Admin User",
        role: { id: 1, name: "Admin" }  // Backend response
    }
};

console.log("Mock login response:", mockLoginResponse);

// Test the redirect logic
const role = mockLoginResponse.user.role;
let roleName = "";
if (typeof role === 'object' && role.name) {
    roleName = role.name;
} else if (typeof role === 'string') {
    roleName = role;
}
roleName = roleName.toLowerCase().trim();

const adminRoles = ["admin", "superadmin", "administrator", "manager", "editor", "librarian", "staff"];
const isAdmin = adminRoles.includes(roleName);

console.log("Extracted role:", roleName);
console.log("Should redirect to admin?", isAdmin ? "✅ YES /admin/dashboard" : "❌ NO (go to /)");
console.groupEnd();

// TEST 8: Monitor API calls for categories
console.group("🌐 API Call Monitoring");
console.log("Monitoring API calls for subcategories...");

// Intercept fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
    if (args[0].includes('subcategories')) {
        console.log("📡 Subcategories API call:", args[0]);
    }
    if (args[0].includes('token')) {
        console.log("🔑 Login API call:", args[0]);
    }
    return originalFetch.apply(this, args);
};

console.log("Fetch interceptor installed");
console.log("(Make API calls and check console)");
console.groupEnd();

// TEST 9: Check dropdown z-index
console.group("📍 Z-Index & Positioning Check");
setTimeout(() => {
    const dropdown = document.querySelector('[aria-haspopup="listbox"] + motion div');
    if (dropdown) {
        const styles = window.getComputedStyle(dropdown);
        console.log("Dropdown z-index:", styles.zIndex);
        console.log("Dropdown position:", styles.position);
        console.log("Dropdown top:", styles.top);
        console.log("Element:", dropdown);
        console.log("Visible on page?", styles.display !== 'none' ? "✅ Yes" : "❌ No");
    } else {
        console.log("Dropdown not found - click the dropdown first");
    }
}, 100);
console.groupEnd();

// TEST 10: Visual debugging - highlight category dropdown
console.group("🎨 Visual Debugging");
console.log("Highlighting all interactive elements...");
const style = document.createElement('style');
style.innerHTML = `
    [aria-haspopup="listbox"] {
        outline: 3px solid red !important;
    }
    [role="option"] {
        outline: 2px solid blue !important;
    }
`;
document.head.appendChild(style);
console.log("✅ Added visual outlines - dropdowns: RED, options: BLUE");
console.log("To remove: call document.head.removeChild(document.head.lastChild)");
console.groupEnd();

// Export all tests as object
window.LIL_TESTS = {
    checkCategories: () => fetch('http://127.0.0.1:8000/api/subcategories').then(r => r.json()),
    checkRole: () => JSON.parse(localStorage.getItem('user_details'))?.role,
    checkAdmin: () => {
        const role = JSON.parse(localStorage.getItem('user_details'))?.role;
        const roleName = (typeof role === 'object' ? role.name : role || '').toLowerCase();
        return ["admin", "superadmin", "administrator", "manager", "editor", "librarian", "staff"].includes(roleName);
    },
    clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_details');
        sessionStorage.removeItem('access_token');
        console.log("✅ Auth cleared");
    }
};

console.log("%c🚀 Test utilities loaded! Use window.LIL_TESTS", "color: green; font-size: 14px; font-weight: bold;");
