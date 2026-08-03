export const USER_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  EMPLOYEE: "employee",
  RECEPTION: "recepcion",
  SPECIALIST: "especialista",
};

export function isPrivilegedRole(role) {
  return role === USER_ROLES.OWNER || role === USER_ROLES.ADMIN;
}

export function isAdminRole(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.OWNER;
}

export function isSpecialistRole(role) {
  return role === USER_ROLES.SPECIALIST;
}

export function isReceptionRole(role) {
  return role === USER_ROLES.RECEPTION;
}

export function getRoleLabel(role) {
  switch (role) {
    case USER_ROLES.OWNER:
      return "Dueña";
    case USER_ROLES.ADMIN:
      return "Administración";
    case USER_ROLES.RECEPTION:
      return "Recepción";
    case USER_ROLES.SPECIALIST:
      return "Especialista";
    case USER_ROLES.EMPLOYEE:
      return "Empleado";
    default:
      return "Sin rol";
  }
}

