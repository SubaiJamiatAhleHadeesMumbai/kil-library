import React from "react";
import useUserRole from "../../hooks/useUserRole";

const RoleGate = ({
  roles = [],
  permission = null,
  fallback = null,
  children,
}) => {
  const { hasAnyRole, can } = useUserRole();

  const roleAllowed = roles.length > 0 ? hasAnyRole(roles) : true;
  const permissionAllowed = permission ? can(permission) : true;

  if (!roleAllowed || !permissionAllowed) {
    return fallback;
  }

  return children;
};

export default RoleGate;
