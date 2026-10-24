# Admin Encrypted Backup & Restore and Direct Email Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement selectable & AES-256-GCM encrypted backup/restore in the Admin dashboard, alongside direct HTML email invitations with locked/unchangeable invite code registration.

**Architecture:**
- **Encryption Engine**: Passphrase-derived AES-256-GCM using PBKDF2 (100,000 rounds SHA-256) via Web Crypto / Node crypto, outputting verifiable `.runbackup.json` bundles.
- **Restore Service**: Granular transactional upsert/merge logic for links, domains, utms, webhooks, site settings, and invite codes.
- **Email Transport**: Universal dispatcher supporting Resend API, SMTP, and Console preview, delivering a responsive dark-themed invitation email.
- **Registration Lock**: Prepopulated invite code from URL query parameters becomes strictly read-only with visual lock indicators.

**Tech Stack:** SvelteKit 2, Svelte 5 (Runes), Drizzle ORM, LibSQL/SQLite, Web Crypto API, Bun Test.

---

### Task 1: Encryption & Decryption Core Library with Unit Tests

**Files:**
- Create: `src/lib/server/backup-crypto.ts`
- Create: `tests/backup-crypto.test.ts`

- [ ] Write failing test in `tests/backup-crypto.test.ts` testing:
  - Encrypting JSON payload with passphrase.
  - Decrypting with valid passphrase returns original JSON.
  - Decrypting with invalid passphrase throws clear decryption error.
  - Non-encrypted payload detection and passthrough.
- [ ] Run test with `bun test tests/backup-crypto.test.ts` to verify failure.
- [ ] Implement `src/lib/server/backup-crypto.ts`:
  - `encryptBackup(data: unknown, passphrase?: string): Promise<string>`
  - `decryptBackup(envelopeStr: string, passphrase?: string): Promise<any>`
- [ ] Run `bun test tests/backup-crypto.test.ts` to confirm test passes.
- [ ] Commit: `feat(backup): add AES-256-GCM backup encryption and decryption engine`

---

### Task 2: Database Backup & Restore Services with Selective Scopes

**Files:**
- Create: `src/lib/server/backup-service.ts`
- Create: `tests/backup-service.test.ts`

- [ ] Write failing test in `tests/backup-service.test.ts` testing:
  - Selective dataset export (e.g. only `links` and `siteSettings`).
  - Restoring datasets with merge & overwrite behavior.
- [ ] Run `bun test tests/backup-service.test.ts` to verify failure.
- [ ] Implement `src/lib/server/backup-service.ts`:
  - `exportDatasets(tables: string[])`: collects data from `links`, `domains`, `utmTemplates`, `webhooks`, `siteSettings`, `inviteCodes`.
  - `restoreDatasets(datasets: Record<string, any[]>, options: { overwrite: boolean })`: performs transactional upsert/insert.
- [ ] Run `bun test tests/backup-service.test.ts` to verify tests pass.
- [ ] Commit: `feat(backup): add selective database export and merge-restore service`

---

### Task 3: Email Dispatcher & Responsive Invitation Template

**Files:**
- Create: `src/lib/server/email.ts`
- Create: `tests/email.test.ts`

- [ ] Write failing test in `tests/email.test.ts` validating:
  - HTML invitation email template contains app title, invite code, and registration button URL.
  - Dispatcher formats payload for Resend API and Console fallback.
- [ ] Run `bun test tests/email.test.ts` to verify failure.
- [ ] Implement `src/lib/server/email.ts`:
  - `generateInviteEmailHtml({ code, appName, origin, role, maxUses })`
  - `sendInviteEmail({ recipient, code, role, origin, maxUses })` with Resend/SMTP/Console fallback.
- [ ] Run `bun test tests/email.test.ts` to verify tests pass.
- [ ] Commit: `feat(email): add branded HTML invitation template and email dispatcher`

---

### Task 4: Backup Export & Restore Endpoints & Server Actions

**Files:**
- Create: `src/routes/api/admin/backup/export/+server.ts`
- Create: `src/routes/api/admin/backup/restore/+server.ts`
- Modify: `src/routes/admin/+page.server.ts`

- [ ] Implement `export/+server.ts` GET/POST:
  - Validates admin auth.
  - Accepts selected datasets array and optional passphrase.
  - Streams or sends downloadable attachment `run-backup-<timestamp>.runbackup.json`.
- [ ] Implement `restore/+server.ts` POST:
  - Validates admin auth.
  - Receives uploaded backup JSON/encrypted file + passphrase + overwrite flag.
  - Decrypts, validates, executes restore, and returns item counts summary.
- [ ] Add `sendInviteEmail` and `createAndEmailInvite` actions to `src/routes/admin/+page.server.ts`.
- [ ] Verify endpoints with a test script or `bun test`.
- [ ] Commit: `feat(admin): add backup endpoints and invite email dispatch actions`

---

### Task 5: Admin UI: Dedicated Backup & Restore Tab + Direct Email Invite Actions

**Files:**
- Modify: `src/routes/admin/+page.svelte`
- Modify: `src/routes/settings/+page.svelte`

- [ ] Add **Backup & Restore** navigation tab in `src/routes/admin/+page.svelte`:
  - Granular checkboxes: Links, Domains, UTM Templates, Webhooks, Site Settings, Invite Codes.
  - Optional passphrase field with show/hide toggle.
  - Export button triggering download.
  - File upload dropzone for `.json` and `.runbackup.json` files.
  - Passphrase input for decryption and Overwrite checkbox.
  - Restore button with live progress and completion feedback banner.
- [ ] Update **Invites** tab in `src/routes/admin/+page.svelte`:
  - Add "Send via Email" modal/dialog on each invite code row.
  - Add recipient email input to the invite creation form with "Create & Send Email" button.
- [ ] Update `/settings#backup` to link directly to `/admin#backup` for super admins while keeping manual JSON snapshot fallback.
- [ ] Commit: `feat(admin): add Backup & Restore tab and direct email invite UI`

---

### Task 6: Read-Only Locked Invite Code on Registration Page

**Files:**
- Modify: `src/routes/login/+page.svelte`
- Modify: `src/routes/login/+page.server.ts`

- [ ] In `src/routes/login/+page.svelte`:
  - When `data.initialInviteCode` is present, render the input with `readonly`, `cursor-not-allowed`, and a distinct locked badge (`Lock` icon + "Locked to your invitation link").
  - When no code was passed via URL, maintain editable text input for manual VIP code entry.
- [ ] Run `npx vite build` to ensure compiler and typecheck pass cleanly.
- [ ] Commit: `feat(auth): lock invite code field to read-only when accessed via invite link`

---

### Task 7: Full Verification & E2E Validation

- [ ] Run `bun test` to verify all test suites pass.
- [ ] Run `npx vite build` to confirm client & SSR builds with zero errors.
- [ ] Verify backup encryption/decryption, restore merge, email delivery simulation, and locked invite field.
- [ ] Update documentation / changelog if appropriate.
