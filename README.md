# Run ⚡

**Run** is a high-performance, edge-first link management and analytics platform built on **SvelteKit 2 (Svelte 5 Runes)**, **Vercel Edge**, **Turso (LibSQL/SQLite)**, **Upstash Redis (Vercel KV)**, and **Tinybird**.

---

## 🚀 Key Features & Capabilities

- **Ultra-Fast Edge Resolution (<10ms)**:
  - Multi-tier caching: **Upstash Redis / Vercel KV** with write-through back into **Turso (LibSQL)**.
  - SvelteKit edge handle hooks running on Vercel Edge.
- **Dynamic Routing & Device Redirection**:
  - **Device Targeting**: Automatically redirect iOS users to the Apple App Store and Android users to Google Play via `ua-parser-js`.
  - **Geo-Targeting**: Country-specific destinations based on `x-vercel-ip-country`.
  - **A/B Split Testing**: Weighted traffic percentage splits across multiple destination variants.
  - **Query Forwarding & UTM Presets**: Retains query parameters while stripping internal security tokens, with reusable workspace UTM templates.
- **6 Secure Delivery Modes**:
  1. **Direct Redirect**: Instant 301/302 edge redirect.
  2. **Password Protection**: Web Crypto PBKDF2 (100,000 iterations) challenge gate.
  3. **NSFW Age Verification**: Cryptographic HMAC-SHA256 18+ birth confirmation gate.
  4. **Interstitial Countdown**: Branded countdown timer with `<meta http-equiv="refresh">` fallback.
  5. **Link Cloaking**: Responsive full-viewport iframe cloaking.
  6. **Clean Reverse Proxy**: Full hop-by-hop header scrubbing with client IP preservation.
- **Expiration & Click Limits**:
  - Auto-expires links by date/time or total click count with custom fallback URLs.
- **Real-Time Analytics & 3D WebGL Globe**:
  - Non-blocking click stream ingestion into **Tinybird** (serverless ClickHouse).
  - Interactive **3D WebGL Globe** built with Three.js rendering live geo-traffic pins.
  - Pseudo-live replay queue streaming incoming clicks smoothly on the dashboard.
- **QR Code Studio**:
  - Vector SVG and PNG export with customizable dot patterns, corner squares, colors, and embedded logos.
- **AI-Powered (Google Gemini)**:
  - Generates catchy short slugs, summaries, and tags from destination URLs via the Vercel AI SDK.
- **Native MCP Server (`/api/mcp`)**:
  - Exposes JSON-RPC Model Context Protocol tools (`create_link`, `list_links`, `get_link`, `check_link_health`) for AI agents.
- **OpenAPI 3.1 & Interactive Docs**:
  - Fully documented REST API endpoints at `/api/openapi.json`.

---

## 🛠️ Stack Overview

| Layer | Component |
| :--- | :--- |
| **Framework** | SvelteKit 2 + Svelte 5 (Runes) |
| **Styling** | Tailwind CSS v4, Lucide Svelte, Bits UI |
| **Database** | Turso (LibSQL / SQLite) via Drizzle ORM |
| **Edge Cache** | Upstash Redis (`@upstash/redis`) / Vercel KV |
| **Analytics Engine** | Tinybird (ClickHouse) |
| **Authentication** | Better Auth (Drizzle adapter with multi-tenant workspaces & API keys) |
| **AI SDK** | Vercel AI SDK (`ai` + `@ai-sdk/google` Gemini 2.5 Flash) |
| **Object Storage** | Vercel Blob (`@vercel/blob`) for database backups |

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment (`.env`)
```env
DATABASE_URL="file:local.db"
DATABASE_AUTH_TOKEN=""
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="your-32-char-random-secret"
SITE_TOKEN="your-secure-hmac-salt"

# Optional production services
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
TINYBIRD_API_URL="https://api.us-east.tinybird.co"
TINYBIRD_TOKEN=""
GOOGLE_GENERATIVE_AI_API_KEY=""
```

### 3. Database Schema Push & Migrations
```bash
bun run db:push
```

### 4. Run Development Server
```bash
bun run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## 🤖 MCP Server Integration

To connect Run to Claude, Antigravity, or Cursor as an MCP server, add to your MCP client configuration:

```json
{
  "mcpServers": {
    "run": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "http://localhost:5173/api/mcp"]
    }
  }
}
```
Available tools:
- `create_link`: Create a short link with slug, destination, delivery security, and rules.
- `list_links`: List active workspace links with pagination.
- `get_link`: Query real-time statistics and details for a specific slug.
- `check_link_health`: Ping and verify destination URL reachability.
