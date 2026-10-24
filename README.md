# Run ⚡

**Run** is a production-grade, edge-first link management, delivery security, multi-tenant workspace, and real-time analytics platform built with **SvelteKit 2 (Svelte 5 Runes)**, **Vercel Edge**, **Turso (LibSQL/SQLite)**, **Upstash Redis (Vercel KV)**, and **Tinybird**.

---

## 🚀 Key Features & Capabilities

### 1. Multi-Tenant Workspaces & Complete Link Isolation
- **Personal Workspaces by Default**: Every registered user automatically receives a private **Personal Workspace**. Links, clicks, custom domains, and analytics are strictly isolated—users never see or access another user's links.
- **Collaborative Team Workspaces**: Users with `trusted` or `admin` roles can create shared Team Workspaces for organizations and departments.
- **Tamper-Proof Workspace Invitations**:
  - Direct email dispatch via Resend/SMTP/Console.
  - Signed, tamper-proof 7-day shareable join links (`/workspace/join?token=...`).
  - Interactive acceptance flow at `/workspace/join`.
- **Interactive Workspace Switcher**: Seamlessly switch between personal and team workspaces on desktop (`AppSidebar.svelte`) and mobile (`/m`).

### 2. High-Performance Edge Resolution (<10ms)
- Multi-tier edge caching: **Upstash Redis / Vercel KV** with write-through consistency to **Turso (LibSQL)**.
- Edge routing middleware running natively on Vercel Edge.

### 3. 6 Secure Delivery Modes
1. **Direct Redirect**: Instant 301/302 edge redirect with query parameter forwarding.
2. **Password Protection**: Web Crypto PBKDF2 (100,000 iterations) challenge gate.
3. **NSFW Age Verification**: Cryptographic HMAC-SHA256 18+ confirmation gate.
4. **Interstitial Countdown**: Branded countdown timer with `<meta http-equiv="refresh">` fallback.
5. **Link Cloaking**: Responsive full-viewport iframe cloaking preserving the short domain in browser address bars.
6. **Clean Reverse Proxy**: Full hop-by-hop header scrubbing with real client IP preservation.

### 4. Admin Encrypted Backup & Restore (`/admin`)
- **AES-256-GCM Cryptographic Engine**: Back up all platform data encrypted with a user-defined passphrase using PBKDF2 (100,000 iterations, 12-byte IV, 16-byte authentication tag).
- **Granular Dataset Selection**: Selectively export/restore links, clicks, domains, webhooks, API keys, users, sessions, invite codes, and site settings.
- **Cryptographic Validation**: Dry-run integrity validation and tamper detection before restore execution.

### 5. VIP Invitations & Access Control
- **Dual Registration Modes**: VIP invite codes (`RUN-VIP-XXXXX`) or direct email invitations.
- **One-Click Email Dispatch**: Admins can dispatch invitations directly from `/admin`.
- **Locked Registration Code**: Invitation links (`/login?code=...`) prefill and securely lock the invite code input to prevent tampering.
- **Accurate Global Sessions**: Multi-hop proxy client IP resolver (`cf-connecting-ip`, `x-vercel-forwarded-for`, `x-forwarded-for`, `x-real-ip`) ensuring true client IP tracking across sessions.

### 6. Outgoing Webhooks & Discord Embed Engine (`/webhooks`)
- Real-time telemetry dispatch for `link.clicked`, `link.created`, and `security.blocked`.
- Automatic Discord webhook detection with customizable bot username, avatar, and embed accent color.
- HMAC-SHA256 signature verification (`X-Run-Signature`) for standard HTTP webhooks.

### 7. Dynamic Routing & Device Targeting
- **Device Targeting**: Conditional redirects for iOS (App Store) and Android (Google Play) via `ua-parser-js`.
- **Geo-Targeting**: Country-specific destinations based on `x-vercel-ip-country`.
- **A/B Split Testing**: Weighted traffic percentage splits across multiple destination variants.

### 8. Analytics & 3D WebGL Globe (`/analytics`)
- Interactive **3D WebGL Globe** built with Three.js rendering live geo-traffic pins.
- Real-time telemetry streams with exponential backoff and tab visibility management.

### 9. Dedicated Mobile Dashboard (`/m`)
- Tailored mobile-first interface optimized for touch devices and quick short-link creation.
- Seamless PC/Mobile mode toggling with device auto-detection.

### 10. Native MCP Server (`/api/mcp`) & AI Agents
- Official Model Context Protocol tools (`create_link`, `edit_link`, `list_links`, `check_links`, `get_analytics_views`) for Cursor, Claude Desktop, Antigravity, and autonomous workflows.
- Full AI Agent handbook available in [`AGENT_GUIDE.md`](./AGENT_GUIDE.md).

---

## 🛠️ Stack Overview

| Layer | Component |
| :--- | :--- |
| **Runtime & Package Manager** | **Bun** (`bun`, `bun run`, `bun test`, `bunx`) |
| **Framework** | SvelteKit 2 + Svelte 5 (Runes) |
| **Styling** | Tailwind CSS v4, Lucide Svelte, Bits UI |
| **Database** | Turso (LibSQL / SQLite) via Drizzle ORM |
| **Edge Cache** | Upstash Redis (`@upstash/redis`) / Vercel KV |
| **Analytics Engine** | Tinybird (ClickHouse) / SQLite aggregation |
| **Authentication** | Better Auth (Drizzle adapter with multi-tenant workspaces & API keys) |
| **Cryptography** | Web Crypto API (AES-256-GCM, PBKDF2, HMAC-SHA256) |
| **AI Integration** | Vercel AI SDK (`ai` + `@ai-sdk/google` Gemini 2.0 Flash) |
| **Object Storage** | Vercel Blob (`@vercel/blob`) for automated backups |

---

## 📦 Getting Started (Local Development)

> **Note**: This project strictly uses **Bun** as its package manager and test runner.

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment (`.env`)
```bash
cp .env.example .env
```
Fill in the minimum required parameters:
```env
DATABASE_URL="file:local.db"
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="your-32-char-random-secret"
SITE_TOKEN="your-secure-hmac-salt"
```

### 3. Database Schema Push & Initial Migration
```bash
bun run db:push
```

### 4. Run Test Suite
```bash
bun test
```

### 5. Run Development Server
```bash
bun run dev
```

Visit [http://localhost:5173](http://localhost:5173). The first registered user will automatically become the **Super Administrator** and have their private Personal Workspace initialized.

---

## 🚀 Production Deployment (Vercel + Turso)

1. **Create Turso Database**:
   ```bash
   turso db create run-db
   turso db show --url run-db
   turso db tokens create run-db
   ```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel.
   - Configure Environment Variables in the Vercel Dashboard:
     - `DATABASE_URL`: `libsql://run-db-yourorg.turso.io`
     - `DATABASE_AUTH_TOKEN`: `<your-turso-auth-token>`
     - `ORIGIN`: `https://go.run.link`
     - `BETTER_AUTH_SECRET`: Generate with `openssl rand -base64 32`
     - `SITE_TOKEN`: Generate with `openssl rand -hex 32`
     - `CRON_SECRET`: Generate with `openssl rand -hex 32`
     - *(Optional)* `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`
     - *(Optional)* `RESEND_API_KEY` (for invitation emails)
     - *(Optional)* `BLOB_READ_WRITE_TOKEN`
     - *(Optional)* `GOOGLE_GENERATIVE_AI_API_KEY`
   - Push schema to remote Turso:
     ```bash
     DATABASE_URL="libsql://run-db-yourorg.turso.io" DATABASE_AUTH_TOKEN="..." bun run db:push
     ```

3. **Trigger Releases**:
   ```bash
   bun run release
   ```

---

## 🤖 MCP Server Configuration

To connect Run to Claude Desktop, Cursor, or Antigravity, add to your MCP client config:

```json
{
  "mcpServers": {
    "run": {
      "command": "bunx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://go.run.link/api/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer run_live_YOUR_API_TOKEN"
      }
    }
  }
}
```
Consult [`AGENT_GUIDE.md`](./AGENT_GUIDE.md) for full tool signatures, machine interfaces, and API endpoints.
