import useAuth from "./useAuth";
import {
  ADMIN_ALLOWED_ROLES,
  getUserRole,
  hasAnyRole,
  hasPermission,
  isAdminUser,
} from "../config/accessControl";

export default function useUserRole() {
  const { user, role } = useAuth();

  const normalizedRole = role ? getUserRole({ role }) : getUserRole(user);

  return {
    role: normalizedRole,
    isAdmin: isAdminUser(user || { role: normalizedRole }),
    isRole: (targetRole) => hasAnyRole(user || { role: normalizedRole }, [targetRole]),
    hasAnyRole: (roles = ADMIN_ALLOWED_ROLES) => hasAnyRole(user || { role: normalizedRole }, roles),
    can: (permissionCode) => hasPermission(user || { role: normalizedRole }, permissionCode),
  };
}
