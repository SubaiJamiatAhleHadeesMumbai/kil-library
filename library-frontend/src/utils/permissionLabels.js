const permissionLabels = {
  // User & Role Management
  USER_VIEW: 'View Users',
  USER_MANAGE: 'Manage Users',
  ROLE_VIEW: 'View Roles',
  ROLE_MANAGE: 'Manage Roles',
  ROLE_PERMISSION_ASSIGN: 'Assign Role Permissions',
  PERMISSION_VIEW: 'View Permissions',
  PERMISSION_MANAGE: 'Manage Permissions',

  // Book Management
  BOOK_VIEW: 'View Books',
  BOOK_MANAGE: 'Manage Books',
  BOOK_ISSUE: 'Issue / Return Books',
  CATEGORY_MANAGE: 'Manage Categories',
  LANGUAGE_MANAGE: 'Manage Languages',
  LOCATION_MANAGE: 'Manage Locations',
  COPY_MANAGE: 'Manage Copies',
  COPY_VIEW: 'View Copies',

  // Requests & Circulation
  REQUEST_CREATE: 'Create Requests',
  REQUEST_VIEW: 'View Requests',
  REQUEST_APPROVE: 'Approve Requests',
  REQUEST_MANAGE: 'Manage Requests',
  ISSUE_VIEW: 'View Issues',

  // System & Logs
  LOG_VIEW: 'View Audit Logs',
  FILE_UPLOAD: 'Upload Files',
  DIGITAL_ACCESS_VIEW: 'View Digital Access',
  BOOK_PERMISSION_MANAGE: 'Manage Book Permissions',
  BOOK_PERMISSION_VIEW: 'View Book Permissions',

  // Homepage
  HOMEPAGE_BRANDING_MANAGE: 'Manage Homepage Branding',
  HOMEPAGE_CONTENT_MANAGE: 'Manage Homepage Content',
  HOMEPAGE_LAYOUT_MANAGE: 'Manage Homepage Layout',
  HOMEPAGE_VISIBILITY_MANAGE: 'Manage Homepage Visibility',
  HOMEPAGE_SEARCH_MANAGE: 'Manage Homepage Search',
};

export function getPermissionLabel(name) {
  if (!name) return '';
  return permissionLabels[name] || null;
}

export default permissionLabels;
