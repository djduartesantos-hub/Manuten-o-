# Multi-Factory Access + RBAC (Plant-Scoped Roles)

## Overview
This system supports multi-factory (plant) access where a single user can:
- Belong to multiple plants.
- Have a different role per plant.
- Inherit permissions from the role assigned to the active plant.

The active plant is selected in the UI header/side menu. Permissions and data access are scoped by the selected plant.

## Data Model
- `user_plants` links users to plants and stores the per-plant role.
- `rbac_roles` + `rbac_role_permissions` define permissions per role at tenant scope.

## How It Works
- `plantMiddleware` validates that the user has access to the plant in the URL.
- `requirePermission()` resolves the role for the selected plant and checks permissions.
- `GET /profile/permissions?plantId=...` returns permissions for the active plant.

## UI Flows
### Settings > Gestao Administrativa
- Create users and assign one or more plants.
- Define a role for each plant assignment.

### Plants Page
- Assign users to plants.
- Choose the role per user for the selected plant.

## Notes
- A user must have at least one plant assignment.
- `admin_empresa` and `superadmin` can access all plants in a tenant.

## Troubleshooting
- If permissions appear missing, run the RBAC patch in Settings > SuperAdmin > Reparar RBAC.
- Ensure the active plant is selected in the top bar.
