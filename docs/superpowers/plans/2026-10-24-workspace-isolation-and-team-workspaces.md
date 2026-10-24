# Multi-Workspace Isolation & Team Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure complete URL/link privacy by isolating each user's links into their own Personal Workspace by default, while enabling `trusted` and `admin` users to create and invite members to shared Team Workspaces.

**Architecture:**
- **Personal Workspace Provisioning**: Every user automatically has a private default workspace (`Personal — <User Name>`).
- **Workspace Resolution**: In `src/routes/+layout.server.ts` and `src/lib/server/workspaces.ts`, resolve active workspace from cookie `run_active_workspace` (validated against user's membership in `member` table).
- **Query Scoping**: Scope all link queries in `src/routes/+page.server.ts`, `src/routes/m/+page.server.ts`, `/analytics`, `/domains`, and `/api/links` to `links.workspaceId = activeWorkspaceId`.
- **Team Workspace Management**: API and UI for creating shared workspaces, generating shareable join links (`/workspace/join?token=...`), and direct email invitations.
- **UI Workspace Switcher**: Interactive switcher dropdown in `AppSidebar.svelte` and mobile header with "+ New Workspace" for trusted/admin users.

**Tech Stack:** SvelteKit 2, Svelte 5, Better Auth (organization plugin), Drizzle ORM, LibSQL/SQLite, Bun Test.

---

### Task 1: Workspace Management Core Service & Unit Tests

**Files:**
- Create: `src/lib/server/workspaces.ts`
- Create: `tests/workspaces.test.ts`

- [ ] Write failing test in `tests/workspaces.test.ts`:
  - `ensurePersonalWorkspace(userId, userName)` creates or returns private workspace and adds user as `owner`.
  - `getUserWorkspaces(userId)` lists all workspaces user is a member of.
  - `createTeamWorkspace(creatorId, name, slug)` creates team workspace (verifies role `trusted` | `admin`).
  - `createWorkspaceInviteLink(workspaceId, inviterId)` generates signed or unique join token.
  - `acceptWorkspaceInvite(token, userId)` adds user to workspace.
- [ ] Run test with `bun test tests/workspaces.test.ts` to confirm failure.
- [ ] Implement `src/lib/server/workspaces.ts`.
- [ ] Run `bun test tests/workspaces.test.ts` to confirm test passes.
- [ ] Commit: `feat(workspaces): add workspace provisioning, membership, and join token services`

---

### Task 2: Layout Resolution & Data Query Scoping (Multi-Tenant Privacy)

**Files:**
- Modify: `src/routes/+layout.server.ts`
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/m/+page.server.ts`
- Modify: `src/routes/analytics/+page.server.ts`
- Modify: `src/routes/m/analytics/+page.server.ts`
- Modify: `src/routes/api/links/+server.ts`

- [ ] Update `src/routes/+layout.server.ts`:
  - Resolve `userWorkspaces` for authenticated user.
  - Determine `activeWorkspace` from cookie `run_active_workspace` (or fallback to personal workspace).
  - Expose `activeWorkspace` and `userWorkspaces` to all pages.
- [ ] Update `src/routes/+page.server.ts`:
  - Filter `links` query by `where(and(eq(links.isArchived, false), eq(links.workspaceId, activeWorkspace.id)))`.
  - Filter `statsResult` total clicks by `workspaceId`.
  - Filter `domains` by `workspaceId`.
- [ ] Update `src/routes/m/+page.server.ts` similarly.
- [ ] Update `src/routes/analytics/+page.server.ts` & `src/routes/m/analytics/+page.server.ts` to filter by `activeWorkspace.id`.
- [ ] Update `src/routes/api/links/+server.ts`:
  - In `GET`: filter links by authenticated user's active workspace.
  - In `POST`: assign newly created link to active workspace.
- [ ] Run `bun test` to ensure existing and new tests pass.
- [ ] Commit: `feat(privacy): scope all links and analytics queries to active workspace`

---

### Task 3: Workspace Switcher & Team Creation Endpoints

**Files:**
- Create: `src/routes/api/workspaces/switch/+server.ts`
- Create: `src/routes/api/workspaces/create/+server.ts`
- Create: `src/routes/api/workspaces/invite/+server.ts`
- Create: `src/routes/workspace/join/+page.server.ts`
- Create: `src/routes/workspace/join/+page.svelte`

- [ ] Implement `api/workspaces/switch`:
  - Validates user is a member of target workspace ID.
  - Sets cookie `run_active_workspace` and returns `{ success: true }`.
- [ ] Implement `api/workspaces/create`:
  - Verifies user role is `trusted` or `admin`.
  - Creates organization + owner membership.
  - Sets as active workspace.
- [ ] Implement `api/workspaces/invite`:
  - Dispatches workspace email invite or returns shareable join link.
- [ ] Implement `workspace/join/+page.server.ts` and `+page.svelte`:
  - Validates join token, prompts user to join workspace, adds user as member, and redirects to dashboard.
- [ ] Run `bun test` to verify.
- [ ] Commit: `feat(workspaces): add workspace switch, creation, and invitation endpoints`

---

### Task 4: Sidebar Workspace Switcher Dropdown & Modal UI

**Files:**
- Modify: `src/lib/components/AppSidebar.svelte`
- Modify: `src/routes/m/+layout.svelte`

- [ ] In `src/lib/components/AppSidebar.svelte`:
  - Replace static header with interactive Workspace Dropdown:
    - Shows current workspace name and avatar/icon.
    - Dropdown menu showing all user workspaces with checkmark for active one.
    - Click to switch active workspace.
    - If user is `trusted` or `admin`: "+ New Workspace" button opening modal.
    - "Invite Members" modal for workspace owners (shows shareable join link + direct email invite).
- [ ] In `src/routes/m/+layout.svelte`:
  - Add workspace switcher in mobile header.
- [ ] Run `bun run build` to verify SSR and client builds.
- [ ] Commit: `feat(ui): add interactive workspace switcher dropdown and creation modal`

---

### Task 5: Database Migration & Super Admin Ownership Backfill

**Files:**
- Create: `src/lib/server/workspace-migration.ts`

- [ ] Automatically backfill existing links:
  - Find first admin user.
  - Ensure admin's personal workspace exists.
  - Update any orphaned links (`workspaceId = 'default-workspace'`) to admin's personal workspace.
- [ ] Verify full build and end-to-end functionality with `bun test` and `bun run build`.
- [ ] Commit: `feat(workspaces): backfill existing links to primary admin workspace`
