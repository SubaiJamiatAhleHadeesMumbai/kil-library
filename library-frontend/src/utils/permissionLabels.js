const permissionLabels = {
  // 👥 User & Role Management
  USER_VIEW: 'View Users & Profiles',
  USER_MANAGE: 'Manage Users (Create/Edit/Block)',
  ROLE_VIEW: 'View Roles',
  ROLE_MANAGE: 'Manage Roles (Create/Edit)',
  ROLE_PERMISSION_ASSIGN: 'Assign / Revoke Role Permissions',
  PERMISSION_VIEW: 'View Permissions',
  PERMISSION_MANAGE: 'Manage System Permissions',

  // 📚 Books & Catalog Management
  BOOK_VIEW: 'View & Search Books',
  BOOK_MANAGE: 'Manage Books (Create/Edit/Upload/Delete)',
  BOOK_ISSUE: 'Issue / Return Physical Books',
  CATEGORY_MANAGE: 'Manage Categories & Subcategories',
  LANGUAGE_MANAGE: 'Manage Catalog Languages',
  LOCATION_MANAGE: 'Manage Physical Shelves & Racks',
  COPY_MANAGE: 'Manage Physical Book Inventory Copies',
  COPY_VIEW: 'View Physical Copies',

  // 📜 Fatawa & Guidance Hub
  FATAWA_MANAGE: 'Manage Fatawa (Answer, Upload Signed PDF, Publish)',
  FATAWA_VIEW: 'View Public & Private Fatawa Submissions',

  // 🤝 Social Work & Community Welfare
  SOCIAL_WORK_MANAGE: 'Manage Education, Welfare & Activities Posts',

  // 📬 Requests & Borrowing Circulation
  REQUEST_CREATE: 'Submit Borrow / Digital Access Requests',
  REQUEST_VIEW: 'View Member Access Request Queues',
  REQUEST_APPROVE: 'Approve / Reject Borrow Requests',
  REQUEST_MANAGE: 'Manage Member Requests Lifecycle',
  ISSUE_VIEW: 'View Overdue & Active Issued Books',

  // 🔒 Security, Audit & Access Control
  LOG_VIEW: 'View Security Audit Logs',
  FILE_UPLOAD: 'Upload Files & Documents to Cloud',
  DIGITAL_ACCESS_VIEW: 'View Digital Reading History & Download Stats',
  BOOK_PERMISSION_MANAGE: 'Manage Restricted Book Access Rules',
  BOOK_PERMISSION_VIEW: 'View Restricted Book Rules',

  // 🎨 Homepage & Layout Settings
  HOMEPAGE_BRANDING_MANAGE: 'Manage Homepage Branding & Logo',
  HOMEPAGE_CONTENT_MANAGE: 'Manage Homepage Banners & Content',
  HOMEPAGE_LAYOUT_MANAGE: 'Manage Homepage Layout & Strips Order',
  HOMEPAGE_VISIBILITY_MANAGE: 'Manage Homepage Sections Visibility',
  HOMEPAGE_SEARCH_MANAGE: 'Manage Universal Search Options',
};

export function getPermissionLabel(name) {
  if (!name) return '';
  return permissionLabels[name] || name.replace(/_/g, ' ');
}

export default permissionLabels;
