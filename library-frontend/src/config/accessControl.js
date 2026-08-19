export const ROLE_NAMES = {
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
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

export const ADMIN_ALLOWED_ROLES = [
  ROLE_NAMES.ADMIN,
  ROLE_NAMES.SUPERADMIN,
  ROLE_NAMES.ADMINISTRATOR,
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.EDITOR,
  ROLE_NAMES.LIBRARIAN,
  ROLE_NAMES.STAFF,
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

export function hasRole(user, role) {
  return getUserRole(user) === normalizeRole(role);
}

export function hasAnyRole(user, roles = []) {
  const normalizedTarget = new Set((roles || []).map((r) => normalizeRole(r)));
  return normalizedTarget.has(getUserRole(user));
}

export function isAdminRole(roleLike) {
  return ADMIN_ALLOWED_ROLES.includes(normalizeRole(roleLike));
}

export function isAdminUser(user) {
  return isAdminRole(getUserRole(user));
}

export function hasPermission(user, permissionCode) {
  if (!user) return false;

  if (isAdminUser(user)) return true;

  const permissions = getUserPermissions(user);

  if (!permissionCode) return true;

  if (Array.isArray(permissionCode)) {
    return permissionCode.some((code) => permissions.includes(code));
  }

  return permissions.includes(permissionCode);
}
