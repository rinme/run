# Run — AI Agent Handbook & Machine Protocol Guide
**Version:** 2.6.2  
**Target:** Autonomous AI Agents, LLM Integrators, MCP Clients & Automated Workflow Engines

---

## 1. Executive Summary & Capabilities

**Run** is a high-speed, edge-first link management, multi-tenant workspace, security gating, and analytics platform. It runs on the Vercel Edge Runtime and LibSQL/Turso database with write-through KV caching.

### Core Capabilities for AI Agents
1. **Multi-Tenant Workspaces & Privacy Isolation**:
   - Every user automatically receives a private **Personal Workspace** upon signup/login.
   - All links, custom domains, and analytics are strictly workspace-isolated (`links.workspaceId`).
   - `trusted` and `admin` users can create collaborative **Team Workspaces** and invite team members.
   - Signed, tamper-proof 7-day join tokens and direct invitation emails.
2. **Encrypted Admin Backup & Restore**:
   - AES-256-GCM authenticated encryption with PBKDF2 key derivation (100,000 iterations).
   - Granular dataset selection for export and import.
   - Dry-run validation and tamper-detection prior to data restoration.
3. **VIP Invitation Engine & Locked Registration**:
   - Invitation codes (`RUN-VIP-XXXXX`) and direct email dispatch from `/admin`.
   - Registration flow locks the code input when visited via `/login?code=...` to ensure invite integrity.
4. **Accurate Client IP Resolution**:
   - Multi-hop reverse proxy extraction (`cf-connecting-ip`, `x-vercel-forwarded-for`, `x-forwarded-for`, `x-real-ip`).
   - Automatic session record self-healing to eliminate `127.0.0.1` placeholders in global active session tracking.
5. **High-Speed Link Resolution (<10ms)**:
   - Multi-tier edge caching with Upstash Redis / Vercel KV write-through to Turso LibSQL.
6. **6 Dynamic Delivery Modes**:
   - `direct`: Ultra-fast HTTP 302 edge redirect with query parameter preservation.
   - `password`: PBKDF2 Web Crypto challenge gate requiring secret passkey verification.
   - `age_gate`: HMAC-SHA256 token verification gate (`?_verified=...`).
   - `interstitial`: Timed countdown screen with auto-refresh meta tags.
   - `cloaked`: Viewport-constrained HTML iframe mask preserving the short domain in browser address bar.
   - `reverse_proxy`: Transparent upstream streaming fetch with hop-by-hop header scrubbing.
7. **Dynamic Device & Geo Targeting**:
   - Instant conditional rerouting based on client User-Agent (`iOS`, `Android`) and Edge country headers (`x-vercel-ip-country`).
8. **Model Context Protocol (MCP)**:
   - Native JSON-RPC 2.0 interface at `/api/mcp` for agentic pair programming and automated link management.
9. **Real-time Event Webhooks & Discord Embeds**:
   - Automated dispatching for `link.clicked`, `link.created`, and `security.blocked` with automatic Discord rich embed styling.

---

## 2. Authentication, Roles & Multi-Tenant Workspaces

### 1. Machine Authentication
All machine requests must authenticate using a Bearer token generated from the Run API Keys management dashboard (`/api-keys`).

```http
Authorization: Bearer run_live_YOUR_SECRET_KEY
```

API keys are bound to a specific `workspaceId`. Any link created or queried using an API key is strictly scoped to that key's workspace.

### 2. User Roles & Permissions
| Role | Capabilities |
| :--- | :--- |
| `admin` | Full system governance, global site config, encrypted backup/restore, cross-user session revocation, invite code & email authority, team workspace creation. |
| `trusted` | Short link lifecycle, team workspace creation, outgoing webhooks, Discord embed customization, VIP invite generation. |
| `member` | Short link creation within personal workspace and invited team workspaces, custom QR codes, personal analytics inspection. |

### 3. Workspace Roles
Within a specific workspace:
- `owner`: Can rename, manage members, generate invite links, and delete the workspace.
- `admin`: Can manage links, domains, and invite collaborators.
- `member`: Can create, edit, and view links within the workspace.

---

## 3. Multi-Tenant Workspace Architecture & APIs

### 1. Workspace Resolution Flow
1. **Cookie Inspection**: Server loads check the `run_active_workspace` cookie.
2. **Membership Verification**: The system verifies that the authenticated user has an active membership record in the `member` table for that organization ID.
3. **Automatic Fallback**: If no cookie is present or access is invalid, the user defaults to their private **Personal Workspace** (`ensurePersonalWorkspace`).

### 2. Workspace Endpoints

#### Switch Active Workspace
- `POST /api/workspaces/switch`
- **Payload:** `{ "workspaceId": "uuid" }`
- **Response:** `{ "success": true, "workspaceId": "uuid" }` (sets `run_active_workspace` cookie).

#### Create Team Workspace
- `POST /api/workspaces/create`
- **Requirements:** Role must be `trusted` or `admin`.
- **Payload:** `{ "name": "Team Growth Marketing" }`
- **Response:** `{ "success": true, "workspace": { ... } }` (automatically sets new workspace as active).

#### Invite Collaborator
- `POST /api/workspaces/invite`
- **Payload:**
  ```json
  {
    "workspaceId": "uuid",
    "email": "colleague@company.com",
    "role": "member"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "token": "signed_token_string",
    "joinUrl": "https://go.run.link/workspace/join?token=signed_token_string",
    "emailSent": true
  }
  ```

#### Accept Workspace Invitation
- `GET /workspace/join?token=<token>`: Displays the invitation page.
- `POST /workspace/join`: Accepts the invitation, joins the workspace, and redirects to dashboard.

---

## 4. Encrypted Backup & Restore Specification

Run provides an enterprise-grade administrative backup and restore subsystem located at `/admin`.

### Cryptographic Architecture
- **Algorithm:** AES-256-GCM authenticated encryption.
- **Key Derivation:** Web Crypto `PBKDF2` with SHA-256, 100,000 iterations, 16-byte cryptographically random salt.
- **IV & Tag:** 12-byte initialization vector (IV), 16-byte authentication tag for tamper resistance.
- **Envelope Format:**
  ```json
  {
    "version": 1,
    "encrypted": true,
    "algorithm": "AES-256-GCM",
    "kdf": "PBKDF2",
    "iterations": 100000,
    "salt": "<hex>",
    "iv": "<hex>",
    "tag": "<hex>",
    "ciphertext": "<base64>",
    "metadata": {
      "timestamp": "2026-10-24T23:00:00.000Z",
      "datasets": ["links", "clicks", "domains"]
    }
  }
  ```

### Supported Datasets
- `links`: Short link configurations and routing logic.
- `clicks`: Telemetry and click event logs.
- `domains`: Custom registered and verified domains.
- `webhooks`: Outgoing webhook URLs and Discord configurations.
- `apiKeys`: Hashed API tokens and workspace scopes.
- `users`: User profiles and role assignments.
- `sessions`: Active bearer sessions.
- `inviteCodes`: VIP registration invite codes.
- `siteSettings`: Site configurations and feature flags.

---

## 5. Model Context Protocol (MCP) Interface

Run exposes an official MCP server at `/api/mcp`. Autonomous agents should use these tools over raw SQL queries whenever possible.

### Protocol Details
- **Endpoint:** `POST https://<your-instance>/api/mcp`
- **Content-Type:** `application/json`
- **Protocol:** JSON-RPC 2.0

### Available MCP Tools

#### `create_link`
Creates a short link scoped to the active workspace with optional delivery security, device routing, and geo-targeting.

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "create_link",
    "arguments": {
      "destinationUrl": "https://stripe.com/docs",
      "slug": "stripe-docs",
      "deliveryMode": "direct",
      "redirectWithQuery": true,
      "tags": ["documentation", "payments"]
    }
  }
}
```

#### `edit_link`
Modifies an existing short link's routing rules or archives it.

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "edit_link",
    "arguments": {
      "id": "link_uuid_v4",
      "destinationUrl": "https://stripe.com/docs/v2",
      "deliveryMode": "password",
      "password": "SecurePassword2026!"
    }
  }
}
```

#### `list_links`
Returns links matching pagination and search filters within the authenticated workspace.

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "list_links",
    "arguments": {
      "limit": 25,
      "offset": 0
    }
  }
}
```

#### `check_links`
Checks a list of destination URLs for reachability and HTTP status codes.

```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/call",
  "params": {
    "name": "check_links",
    "arguments": {
      "urls": ["https://example.com", "https://github.com"]
    }
  }
}
```

#### `get_analytics_views`
Queries aggregated click and visit telemetry for the active workspace.

```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "method": "tools/call",
  "params": {
    "name": "get_analytics_views",
    "arguments": {
      "period": "24h",
      "slug": "stripe-docs"
    }
  }
}
```

---

## 6. REST API Specification

### Link Management Endpoints

#### List Links
- `GET /api/links`
- Returns links belonging to the authenticated workspace.

#### Create Link
- `POST /api/links`
- Assigns newly created links to the active workspace.

#### Update Link
- `PATCH /api/links`
- Modifies a link, verifying that the link belongs to the active workspace.

#### Delete Link
- `DELETE /api/links?id=link_id`
- Deletes a link scoped to the active workspace and immediately evicts the edge KV cache.

---

## 7. Database Entity Relationship Model

```mermaid
erDiagram
    ORGANIZATION ||--o{ MEMBER : contains
    ORGANIZATION ||--o{ LINKS : owns
    ORGANIZATION ||--o{ DOMAINS : registers
    ORGANIZATION ||--o{ API_KEYS : authorizes
    ORGANIZATION ||--o{ WEBHOOKS : dispatches
    USER ||--o{ MEMBER : joins
    USER ||--o{ SESSION : authenticates
    USER ||--o{ INVITE_CODES : generates

    ORGANIZATION {
        string id PK
        string name
        string slug UK
        json metadata
        date created_at
    }

    MEMBER {
        string id PK
        string organization_id FK
        string user_id FK
        string role
        date created_at
    }

    LINKS {
        string id PK
        string workspace_id FK
        string slug UK
        string destination_url
        string delivery_mode
        string password_hash
        json device_routing
        json geo_routing
        boolean is_archived
    }

    DOMAINS {
        string id PK
        string workspace_id FK
        string name UK
        boolean verified
        boolean primary
    }

    INVITE_CODES {
        string id PK
        string code UK
        int max_uses
        int used_count
        string role
        boolean is_active
    }

    SITE_SETTINGS {
        string key PK
        json value
    }

    WEBHOOKS {
        string id PK
        string workspace_id FK
        string name
        string url
        string secret
        boolean is_discord
        json discord_config
    }
```

---

## 8. Agentic Operating Guidelines & Release Protocol

1. **Strict Bun Environment**:
   - Always run commands via `bun` (`bun run`, `bun test`, `bunx`).
2. **Never Query Cross-Tenant Data**:
   - Always verify that database queries filter by `workspaceId = activeWorkspace.id`.
3. **Observe KV Invalidation**:
   - Any mutation to a link automatically invalidates the edge cache via `linkCache.invalidate(domain, slug)`.
4. **Autonomous Release Criteria**:
   - For major updates or feature completions, verify via `bun test`.
   - Bump SemVer in `package.json`, commit, push to `main`, and execute `bun scripts/release.ts`.
