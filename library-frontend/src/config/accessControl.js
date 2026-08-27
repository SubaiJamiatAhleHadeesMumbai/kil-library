export const ROLE_NAMES = {
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
  SUPER_ADMIN: "super admin",
  ADMINISTRATOR: "administrator",
  MANAGER: "manager",
  EDITOR: "editor",
  LIBRARIAN: "librarian",
  STAFF: "staff",
  USER: "user",
  STUDENT: "student",
  MEMBER: "member",
  PUBLIC: "public",
  MODERATOR: "moderator",
};

export const PUBLIC_ROLES = [
  ROLE_NAMES.USER,
  ROLE_NAMES.STUDENT,
  ROLE_NAMES.MEMBER,
  ROLE_NAMES.PUBLIC,
];

export const ADMIN_ALLOWED_ROLES = [
  ROLE_NAMES.ADMIN,
  ROLE_NAMES.SUPERADMIN,
  ROLE_NAMES.SUPER_ADMIN,
  ROLE_NAMES.ADMINISTRATOR,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.EDITOR,
  ROLE_NAMES.LIBRARIAN,
  ROLE_NAMES.STAFF,
  "mufti / dar-ul-ifta",
  "head librarian",
  "social & welfare officer"
];

export const STAFF_PERMISSIONS = [
  'BOOK_MANAGE',
  'BOOK_ISSUE',
  'CATEGORY_MANAGE',
  'LANGUAGE_MANAGE',
  'LOCATION_MANAGE',
  'COPY_MANAGE',
  'FATAWA_MANAGE',
  'SOCIAL_WORK_MANAGE',
  'USER_VIEW',
  'USER_MANAGE',
  'ROLE_VIEW',
  'ROLE_MANAGE',
  'ROLE_PERMISSION_ASSIGN',
  'REQUEST_VIEW',
  'REQUEST_APPROVE',
  'LOG_VIEW',
  'HOMEPAGE_BRANDING_MANAGE',
  'HOMEPAGE_CONTENT_MANAGE',
  'HOMEPAGE_LAYOUT_MANAGE',
  'HOMEPAGE_VISIBILITY_MANAGE',
  'HOMEPAGE_SEARCH_MANAGE'
];

export const DEFAULT_ROLE = ROLE_NAMES.USER;

export function normalizeRole(roleLike) {
  if (!roleLike) return DEFAULT_ROLE;

  if (typeof roleLike === "string") {
    const normalized = roleLike.trim().toLowerCase();
    return normalized || DEFAULT_ROLE;
  }

  if (typeof roleLike === "object") {
    const roleName = roleLike.name || roleLike.role || "";
    return normalizeRole(roleName);
  }

  return DEFAULT_ROLE;
}

export function getUserRole(user) {
  if (!user) return DEFAULT_ROLE;
  return normalizeRole(user.role);
}

export function getUserPermissions(user) {
  if (!user || !Array.isArray(user.permissions)) return [];
  return user.permissions;
}

export function isSuperAdmin(user) {
  if (!user) return false;
  const role = getUserRole(user);
  return role === 'admin' || role === 'superadmin' || role === 'super admin' || role === 'administrator';
}

export function isStaffOrAdmin(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const role = getUserRole(user);
  const permissions = getUserPermissions(user);

  // If user has any staff permission assigned
  if (permissions.some((p) => STAFF_PERMISSIONS.includes(p))) {
    return true;
  }

  // If role is not a basic public member
  if (!PUBLIC_ROLES.includes(role)) {
    return true;
  }

  return false;
}

export function isAdminRole(roleLike) {
  const norm = normalizeRole(roleLike);
  return !PUBLIC_ROLES.includes(norm);
}

export function isAdminUser(user) {
  return isStaffOrAdmin(user);
}

export function hasRole(user, role) {
  return getUserRole(user) === normalizeRole(role);
}

export function hasAnyRole(user, roles = []) {
  if (isSuperAdmin(user)) return true;
  const normalizedTarget = new Set((roles || []).map((r) => normalizeRole(r)));
  return normalizedTarget.has(getUserRole(user));
}

export function hasPermission(user, permissionCode) {
  if (!user) return false;

  // Super Admin has all permissions
  if (isSuperAdmin(user)) return true;

  if (!permissionCode) return true;

  const permissions = getUserPermissions(user);

  if (Array.isArray(permissionCode)) {
    return permissionCode.some((code) => permissions.includes(code));
  }

  return permissions.includes(permissionCode);
}
