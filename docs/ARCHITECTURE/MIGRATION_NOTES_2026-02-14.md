# Migration Notes 2026-02-14

Scope: RBAC per-plant roles, menu/navigation refresh, login/profile UI refresh, and RBAC auto-seed for missing permissions.

## Summary
- Adds plant-scoped roles in `user_plants` and updates assignment flows in Settings and Plants pages.
- Ensures RBAC tables/permissions are created if missing (best-effort auto-seed).
- Refreshes navigation (sidebar + header menus) and login/profile screens.

## Database changes
These are applied by the RBAC patch/auto-seed routine:
- Create RBAC tables if missing: `rbac_permissions`, `rbac_roles`, `rbac_role_permissions`, `rbac_role_home_pages`.
- Ensure `rbac_role_home_pages` supports nullable `plant_id` with the correct unique indexes.
- Add `role` column to `user_plants` with default `tecnico` (idempotent).
- Add indexes for RBAC lookups.

## Data considerations
- Existing `user_plants` rows will default to `tecnico`.
- If your tenant needs different roles per plant, update them in:
  - Settings > Gestao Administrativa (plant assignments), or
  - Plants page (per-plant role selector).

## Backend changes
- RBAC auto-seed runs during permission fetch to restore missing keys like `reports:read`.
- New helper: `ensureRbacStructureAndSeed()` (idempotent) in the auto-seed module.

## Frontend changes
- New sidebar layout + header user menu shortcuts.
- Per-plant role selection in Settings and Plants.
- Login/Profile UI refresh and new theme variables.

## Recommended rollout steps
1. Deploy backend and restart the API.
2. Run the RBAC patch in Settings > SuperAdmin > Reparar RBAC (or trigger permissions fetch).
3. Verify that `reports:read` exists and reports are visible.
4. Review plant assignments and set roles per plant.
5. Validate navigation and profile/login pages.

## Rollback notes
- The UI changes can be rolled back independently, but the `user_plants.role` column may remain.
- Removing RBAC tables/columns is not recommended; keep them for forward compatibility.
