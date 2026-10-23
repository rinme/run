# Run ⚡

**Run** is a high-performance, edge-first link management, delivery security, and analytics platform built on **SvelteKit 2 (Svelte 5 Runes)**, **Vercel Edge**, **Turso (LibSQL/SQLite)**, **Upstash Redis (Vercel KV)**, and **Tinybird**.

---

## 🚀 Key Features & Capabilities

- **Ultra-Fast Edge Resolution (<10ms)**:
  - Multi-tier caching: **Upstash Redis / Vercel KV** with write-through back into **Turso (LibSQL)**.
  - Edge routing middleware running natively on Vercel Edge.
- **6 Secure Delivery Modes**:
  1. **Direct Redirect**: Instant 301/302 edge redirect with query parameter forwarding.
  2. **Password Protection**: Web Crypto PBKDF2 (100,000 iterations) challenge gate.
  3. **NSFW Age Verification**: Cryptographic HMAC-SHA256 18+ birth confirmation gate.
  4. **Interstitial Countdown**: Branded countdown timer with `<meta http-equiv="refresh">` fallback.
  5. **Link Cloaking**: Responsive full-viewport iframe cloaking preserving the short domain.
  6. **Clean Reverse Proxy**: Full hop-by-hop header scrubbing with client IP preservation.
- **VIP Invite-Only Access & Session Management**:
  - Dual registration mode: VIP invite codes (`RUN-VIP-XXXXX`) or direct email invitations.
  - Role-based access control: `admin`, `trusted`, `member`.
  - First registered user automatically elevated to **Super Administrator**.
  - Cross-user active bearer session inspection and 1-click revocation.
- **Admin System Control Dashboard (`/admin`)**:
  - Live configuration of website metadata, registration policies, feature flags, and email transport (SMTP, Resend, Console).
  - Global session termination and invite key management.
- **Outgoing Webhooks & Discord Embed Engine (`/webhooks`)**:
  - Real-time telemetry dispatch for `link.clicked`, `link.created`, and `security.blocked`.
  - Automatic Discord webhook detection with customizable bot username, avatar, and embed accent color.
  - HMAC-SHA256 signature verification (`X-Run-Signature`) for standard HTTP webhooks.
- **Dynamic Routing & Device Redirection**:
  - **Device Targeting**: Automatically redirect iOS users to the Apple App Store and Android users to Google Play via `ua-parser-js`.
  - **Geo-Targeting**: Country-specific destinations based on `x-vercel-ip-country`.
  - **A/B Split Testing**: Weighted traffic percentage splits across multiple destination variants.
- **Real-Time Analytics & 3D WebGL Globe**:
  - Interactive **3D WebGL Globe** built with Three.js rendering live geo-traffic pins.
  - Exponential backoff and tab visibility checks for telemetry streams.
- **QR Code Studio (`/qr`)**:
  - Vector SVG and PNG export with customizable dot patterns, corner squares, colors, and embedded logos.
- **Dynamic Changelog (`/changelog`)**:
  - Real-time release synchronization pulling directly from GitHub releases with intelligent 15-minute caching.
- **Native MCP Server (`/api/mcp`) & AI Agents**:
  - Official Model Context Protocol tools (`create_link`, `edit_link`, `list_links`, `check_links`, `get_analytics_views`) for Cursor, Claude Desktop, Antigravity, and autonomous workflows.
  - Full AI Agent handbook available in [`AGENT_GUIDE.md`](./AGENT_GUIDE.md).

---

## 🛠️ Stack Overview

| Layer | Component |
| :--- | :--- |
| **Framework** | SvelteKit 2 + Svelte 5 (Runes) |
| **Styling** | Tailwind CSS v4, Lucide Svelte, Bits UI |
| **Database** | Turso (LibSQL / SQLite) via Drizzle ORM |
| **Edge Cache** | Upstash Redis (`@upstash/redis`) / Vercel KV |
| **Analytics Engine** | Tinybird (ClickHouse) / SQLite aggregation |
| **Authentication** | Better Auth (Drizzle adapter with multi-tenant workspaces & API keys) |
| **AI Integration** | Vercel AI SDK (`ai` + `@ai-sdk/google` Gemini 2.0 Flash) |
| **Object Storage** | Vercel Blob (`@vercel/blob`) for automated daily database backups |

---

## 📦 Getting Started (Local Development)

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

### 3. Database Schema Push
```bash
bun run db:push
```

### 4. Run Development Server
```bash
bun run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## 🚀 Production Deployment (Vercel + Turso)

1. **Create Turso Database**:
   ```bash
   turso db create run-db
   turso db show --url run-db
   turso db tokens create run-db
   ```

2. **Deploy to Vercel**:
   * Connect your GitHub repository to Vercel.
   * Configure Environment Variables in the Vercel Dashboard:
     - `DATABASE_URL`: `libsql://run-db-yourorg.turso.io`
     - `DATABASE_AUTH_TOKEN`: `<your-turso-auth-token>`
     - `ORIGIN`: `https://go.run.link`
     - `BETTER_AUTH_SECRET`: Generate with `openssl rand -base64 32`
     - `SITE_TOKEN`: Generate with `openssl rand -hex 32`
     - `CRON_SECRET`: Generate with `openssl rand -hex 32`
     - *(Optional)* `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`
     - *(Optional)* `BLOB_READ_WRITE_TOKEN`
     - *(Optional)* `GOOGLE_GENERATIVE_AI_API_KEY`
   * Push schema to remote Turso:
     ```bash
     DATABASE_URL="libsql://run-db-yourorg.turso.io" DATABASE_AUTH_TOKEN="..." bun run db:push
     ```

3. **Trigger Releases**:
   ```bash
   bun run release
   ```
   Or push a semver tag: `git push origin v1.3.0`.

---

## 🤖 MCP Server Configuration

To connect Run to Claude Desktop, Cursor, or Antigravity, add to your MCP client config:

```json
{
  "mcpServers": {
    "run": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://go.run.link/api/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer run_live_YOUR_API_TOKEN"
      }
    }
  }
}
```
Consult [`AGENT_GUIDE.md`](./AGENT_GUIDE.md) for full tool signatures and machine interfaces.
