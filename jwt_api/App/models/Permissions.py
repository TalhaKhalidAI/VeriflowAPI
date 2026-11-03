# App/models/Permissions.py

from enum import Enum


class Permission(str, Enum):
    """Minimal permission set for a FastAPI boilerplate."""

  
    # ===== USER SELF-MANAGEMENT =====
    USER_VIEW_SELF = "user.view.self"
    USER_UPDATE_SELF = "user.update.self"
    USER_UPDATE_EMAIL = "user.update.email"
    USER_UPDATE_PASSWORD = "user.update.password"
    USER_UPDATE_PROFILE = "user.update.profile"
    USER_DELETE_SELF = "user.delete.self"
    USER_HISTORY_VIEW = "user.history.view"
    USER_HISTORY_DELETE = "user.history.delete"
    USER_SELF_ENABLE = "user.self.enable"
    USER_SELF_DISABLE = "user.disable.self"

    # ===== USER MANAGEMENT =====
    USER_VIEW_ANY = "user.view.any"
    USER_DELETE_ANY = "user.delete.any"
    USER_ENABLE = "user.enable"
    USER_DISABLE = "user.disable"
    USER_RESTORE = "user.restore"
    USER_PROMOTE = "user.promote"
    GET_USER_ASSIGNED_PERMISSIONS = "user.permission_assign.get"

    # ===== ADMIN PERMISSIONS =====
    ADMIN_ACCESS = "admin.access"
    ADMIN_ANY_PASSWORD_UPDATE = "admin.anyuser.password.update"
    ADMIN_USER_ENABLE = "admin.user.enable"
    ADMIN_USERS_VIEW = "admin.users.view"
    ADMIN_USERS_DISABLE = "admin.users.disable"
    ADMIN_USERS_DELETE = "admin.users.delete"
    ADMIN_USERS_RESTORE = "admin.users.restore"
    ADMIN_USERS_PROMOTE = "admin.users.promote"
    ADMIN_USERS = "admin.users"
    ADMIN_SETTINGS_VIEW = "admin.settings.view"
    ADMIN_SETTINGS_UPDATE = "admin.settings.update"
    ADMIN_VIEW_ALL = "admin.view_all"
    ADMIN_SYSTEM_KILL_SWITCH="admin.system.kill_switch"

    # ===== VERIFLOW: CRYPTO KEY MANAGEMENT =====
    KEYS_VIEW = "keys.view"
    KEYS_CREATE = "keys.create"
    KEYS_UPDATE = "keys.update"
    KEYS_REVOKE = "keys.revoke"
    KEYS_DELETE = "keys.delete"            # delete keys the user personally generated
    KEYS_DELETE_ANY = "keys.delete.any"    # delete ANY key (admin-grade)

    # ===== VERIFLOW: SHIFT MANAGEMENT =====
    SHIFTS_VIEW = "shifts.view"
    SHIFTS_VIEW_ANY = "shifts.view.any"
    SHIFTS_VIEW_ALL = "shifts.view.all"
    SHIFTS_VIEW_OWN = "shifts.view.own"
    SHIFTS_CREATE = "shifts.create"
    SHIFTS_REVOKE = "shifts.revoke"
    SHIFTS_CHECKOUT = "shifts.checkout"
    SHIFTS_DELETE = "shifts.delete"            # delete own shifts the user started themselves
    SHIFTS_DELETE_ANY = "shifts.delete.any"    # delete ANY shift by id (admin-grade)

    # ===== VERIFLOW: INVENTORY RULES =====
    INVENTORY_RULES_VIEW = "inventory_rules.view"
    INVENTORY_RULES_CREATE = "inventory_rules.create"
    INVENTORY_RULES_UPDATE = "inventory_rules.update"
    INVENTORY_RULES_DELETE = "inventory_rules.delete"

    # ===== VERIFLOW: SCAN LOGS =====
    SCANS_VIEW_ANY = "scans.view.any"
    SCANS_VIEW_OWN = "scans.view.own"
    SCANS_CREATE = "scans.create"
    SCANS_UPDATE = "scans.update"
    SCANS_DELETE = "scans.delete"

    # ===== VERIFLOW: PRODUCT QR TAGS =====
    TAGS_CREATE = "tags.create"