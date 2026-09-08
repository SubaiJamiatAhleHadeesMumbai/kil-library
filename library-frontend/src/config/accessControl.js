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
  "user",
  "student",
  "member",
  "viewer",
  "registered member / student",
  "registered member",
  "guest",
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
  'REQUEST_APPROVE',
  'REQUEST_MANAGE',
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
  if (!user) return [];
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.map((p) => (typeof p === 'string' ? p : p.name || p.code)).filter(Boolean);
  }
  if (user.role && Array.isArray(user.role.permissions)) {
    return user.role.permissions.map((p) => (typeof p === 'string' ? p : p.name || p.code)).filter(Boolean);
  }
  return [];
}

export function isSuperAdmin(user) {
  if (!user) return false;
  const role = getUserRole(user);
  return role === 'admin' || role === 'superadmin' || role === 'super admin' || role === 'administrator';
}

export function isStaffOrAdmin(user) {
  if (!user) return false;

  const role = getUserRole(user);
  const normalizedPublicRoles = PUBLIC_ROLES.map((r) => normalizeRole(r));

  // 1. HARD SECURITY INVARIANT: Public roles are NEVER staff or admin!
  if (normalizedPublicRoles.includes(role)) {
    return false;
  }

  // 2. Superadmin check
  if (isSuperAdmin(user)) return true;

  // 3. Positive whitelist check: must be in ADMIN_ALLOWED_ROLES
  const normalizedAdminRoles = ADMIN_ALLOWED_ROLES.map((r) => normalizeRole(r));
  if (normalizedAdminRoles.includes(role)) {
    return true;
  }

  // 4. Staff permissions check ONLY for non-public accounts
  const permissions = getUserPermissions(user);
  if (permissions.some((p) => STAFF_PERMISSIONS.includes(p))) {
    return true;
  }

  return false;
}

export function isAdminRole(roleLike) {
  const norm = normalizeRole(roleLike);
  const normalizedPublicRoles = PUBLIC_ROLES.map((r) => normalizeRole(r));
  if (normalizedPublicRoles.includes(norm)) {
    return false;
  }
  const normalizedAdminRoles = ADMIN_ALLOWED_ROLES.map((r) => normalizeRole(r));
  return normalizedAdminRoles.includes(norm);
}

export function isAdminUser(user) {
  if (!user) return false;
  const role = getUserRole(user);
  const normalizedPublicRoles = PUBLIC_ROLES.map((r) => normalizeRole(r));
  if (normalizedPublicRoles.includes(role)) {
    return false;
  }
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
