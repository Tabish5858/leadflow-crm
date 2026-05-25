import type {
  ModuleId,
  ModulePermissionsByRole,
  ModulePermissionsMap,
} from "@/types";
import { DEFAULT_MEMBER_PERMISSIONS, DEFAULT_VIEWER_PERMISSIONS } from "@/types";

/**
 * Get effective module permissions for a given workspace role.
 * Owner and Admin always get full access to all modules.
 * Member and Viewer get their configured permissions (falling back to defaults).
 */
export function getEffectivePermissions(
  permissions: ModulePermissionsByRole | null | undefined,
  role: string
): ModulePermissionsMap {
  // Owner and Admin get full access
  if (role === "owner" || role === "admin") {
    const full: ModulePermissionsMap = {} as ModulePermissionsMap;
    for (const key of ["dashboard", "leads", "pipeline", "analytics", "time_tracker", "messages", "automations", "meetings", "settings"] as ModuleId[]) {
      full[key] = true;
    }
    return full;
  }

  if (role === "member") {
    const perms: ModulePermissionsMap = permissions?.member
      ? { ...DEFAULT_MEMBER_PERMISSIONS, ...permissions.member }
      : { ...DEFAULT_MEMBER_PERMISSIONS };
    // Members always need access to their own settings
    perms.settings = true;
    return perms;
  }

  if (role === "viewer") {
    const perms: ModulePermissionsMap = permissions?.viewer
      ? { ...DEFAULT_VIEWER_PERMISSIONS, ...permissions.viewer }
      : { ...DEFAULT_VIEWER_PERMISSIONS };
    // Viewers always need access to their own settings
    perms.settings = true;
    return perms;
  }

  // Unknown role — no access
  const none: ModulePermissionsMap = {} as ModulePermissionsMap;
  for (const key of ["dashboard", "leads", "pipeline", "analytics", "time_tracker", "messages", "automations", "meetings", "settings"] as ModuleId[]) {
    none[key] = false;
  }
  return none;
}

/**
 * Check if a user has access to a specific module.
 */
export function canAccessModule(
  permissions: ModulePermissionsByRole | null | undefined,
  role: string,
  moduleId: ModuleId
): boolean {
  const effective = getEffectivePermissions(permissions, role);
  return effective[moduleId] === true;
}

/**
 * Get the list of accessible modules for a role.
 */
export function getAccessibleModules(
  permissions: ModulePermissionsByRole | null | undefined,
  role: string
): ModuleId[] {
  const effective = getEffectivePermissions(permissions, role);
  return (Object.keys(effective) as ModuleId[]).filter((key) => effective[key]);
}
