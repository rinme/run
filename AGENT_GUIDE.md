# Run — AI Agent Handbook & Machine Protocol Guide
**Version:** 2.0.0  
**Target:** Autonomous AI Agents, LLM Integrators, MCP Clients & Automated Workflow Engines

---

## 1. Executive Summary & Capabilities

**Run** is a high-speed, edge-first link management, security gating, and analytics platform. It runs on the Vercel Edge Runtime and LibSQL/Turso database with write-through KV caching.

### Core Capabilities for AI Agents
1. **High-Speed Link Resolution**: In-memory and KV write-through resolution with `<10ms` response times.
2. **6 Dynamic Delivery Modes**:
   - `direct`: Ultra-fast HTTP 302 edge redirect with query parameter preservation.
   - `password`: PBKDF2 Web Crypto challenge gate requiring secret passkey verification.
   - `age_gate`: HMAC-SHA256 token verification gate (`?_verified=...`).
   - `interstitial`: Timed countdown screen with auto-refresh meta tags.
   - `cloaked`: Viewport-constrained HTML iframe mask preserving the short domain in browser address bar.
   - `reverse_proxy`: Transparent upstream streaming fetch with hop-by-hop header scrubbing.
3. **Dynamic Device & Geo Targeting**: Instant conditional rerouting based on client User-Agent (`iOS`, `Android`) and Edge country headers (`x-vercel-ip-country`).
4. **Model Context Protocol (MCP)**: Native JSON-RPC 2.0 interface at `/api/mcp` for agentic pair programming and automated link management.
5. **Real-time Event Webhooks**: Automated dispatching for `link.clicked`, `link.created`, and `security.blocked` with automatic Discord rich embed styling.
6. **Invite-Only Registration System**: Cryptographically generated invite tokens (`RUN-VIP-XXXXX`) and role-based permissions (`admin`, `trusted`, `member`).

---

## 2. Authentication & Authorization

All machine requests must authenticate using a Bearer token generated from the Run API Keys management dashboard (`/api-keys`).

```http
Authorization: Bearer run_live_YOUR_SECRET_KEY
```

### Role Hierarchy
| Role | Capabilities |
| :--- | :--- |
| `admin` | Full system governance, global site config, cross-user session revocation, invite authority. |
| `trusted` | Short link lifecycle, outgoing webhooks, Discord embed customization, VIP invite generation. |
| `member` | Short link creation, custom QR codes, personal analytics inspection. |

---

## 3. Model Context Protocol (MCP) Interface

Run exposes an official MCP server at `/api/mcp`. Autonomous agents should use these tools over raw SQL queries whenever possible.

### Protocol Details
- **Endpoint:** `POST https://<your-instance>/api/mcp`
- **Content-Type:** `application/json`
- **Protocol:** JSON-RPC 2.0

### Available MCP Tools

#### `create_link`
Creates a short link with optional delivery security, device routing, and geo-targeting.

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
Returns links matching pagination and search filters.

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
Queries aggregated click and visit telemetry.

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

## 4. REST API Specification

### 1. OpenAPI 3.1 Definition
- Inspect current schema: `GET /api/openapi.json`

### 2. Link Management Endpoints

#### List Links
- `GET /api/links`
- **Response:** Array of link records ordered by creation date.

#### Create Link
- `POST /api/links`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer run_live_...`
- **Payload Schema:**
  ```json
  {
    "destinationUrl": "https://example.com/target",
    "slug": "custom-slug",
    "title": "Optional Card Title",
    "description": "Optional Card Description",
    "image": "https://example.com/banner.png",
    "deliveryMode": "direct",
    "password": null,
    "interstitialDuration": 5,
    "expiresAt": null,
    "maxClicks": 1000,
    "redirectWithQuery": true,
    "deviceRouting": {
      "ios": "https://apps.apple.com/app/id123",
      "android": "https://play.google.com/store/apps/details?id=com.app"
    },
    "geoRouting": {
      "US": "https://us.example.com",
      "DE": "https://de.example.com"
    },
    "tags": ["launch", "mobile"]
  }
  ```

#### Update Link
- `PATCH /api/links`
- **Payload:** Requires `"id": "link_id"`, plus any updated fields.

#### Delete Link
- `DELETE /api/links?id=link_id`
- Soft-deletes the link (`isArchived: true`) and immediately evicts the KV edge cache.

---

## 5. Delivery Modes Specification

When creating or modifying links, agents can assign one of the 6 delivery modes:

| Mode | Key | Behavior | Gate Logic |
| :--- | :--- | :--- | :--- |
| **Direct** | `direct` | Instant HTTP 302 Edge redirect. | Forward client to destination URL. Preserve query strings if `redirectWithQuery=true`. |
| **Password** | `password` | PBKDF2 Password Challenge Screen. | Checked via `?_pwd=<password>` or interactive form. Web Crypto PBKDF2 100,000 iterations. |
| **Age Gate** | `age_gate` | NSFW 18+ Verification Modal. | Checked via `?_verified=<token>` (HMAC-SHA256 signature of slug + site secret). |
| **Interstitial** | `interstitial` | 5-second countdown timer. | Returns HTML with progress bar and `<meta http-equiv="refresh">` target. |
| **Cloaked** | `cloaked` | Full-viewport `<iframe>` wrapper. | Keeps `go.run.link/<slug>` in the browser URL bar while embedding the target content. |
| **Reverse Proxy** | `reverse_proxy` | Transparent upstream edge streaming. | Server fetches target URL, strips hop headers, and returns body directly to client. |

---

## 6. Outgoing Webhooks & Discord Telemetry Engine

Run dispatches asynchronous HTTP POST requests to configured webhooks on platform events.

### Subscribed Events
- `link.clicked`: Triggered whenever an incoming request resolves and redirects.
- `link.created`: Triggered when a new short link is saved.
- `security.blocked`: Triggered when a password gate or age verification challenge fails.

### Automatic Discord Webhook Detection
If the target URL matches `https://discord.com/api/webhooks/*`, Run automatically formats the payload as a rich Discord Embed:
- **Bot Customization:** Configurable `username`, `avatar_url`, and decimal `embedColor`.
- **Telemetry Fields:** Automatic extraction of `Slug`, `Destination URL`, `Location (City, Country)`, `Client (Device, OS, Browser)`, and `Referer`.

### Standard Webhook Payload Structure
```json
{
  "id": "evt_018f32a8-8e6d-7cb1-92bc-418f78a2e105",
  "event": "link.clicked",
  "timestamp": "2026-10-24T00:15:00.000Z",
  "data": {
    "slug": "launch",
    "destinationUrl": "https://example.com/target",
    "deliveryMode": "direct",
    "country": "US",
    "city": "San Francisco",
    "deviceType": "Desktop",
    "browser": "Chrome 131",
    "os": "macOS",
    "referer": "https://t.co/",
    "ip": "198.51.100.42"
  }
}
```
If a `secret` is configured, an HMAC-SHA256 signature is transmitted in header:
```http
X-Run-Signature: 7c54a...
```

---

## 7. Database Entity Relationship Model

```mermaid
erDiagram
    ORGANIZATION ||--o{ LINKS : owns
    ORGANIZATION ||--o{ DOMAINS : registers
    ORGANIZATION ||--o{ API_KEYS : authorizes
    ORGANIZATION ||--o{ WEBHOOKS : dispatches
    USER ||--o{ SESSION : authenticates
    USER ||--o{ INVITE_CODES : generates

    LINKS {
        string id PK
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
        string name
        string url
        string secret
        boolean is_discord
        json discord_config
    }
```

---

## 8. Agentic Best Practices & Error Recovery

1. **Avoid Slug Collisions:** Always query `list_links` or catch HTTP 409 Conflict when generating custom slugs.
2. **Observe KV Cache Invalidation:** Creating, updating, or deleting a link automatically calls `linkCache.invalidate(domain, slug)`. Subsequent requests will hit Turso LibSQL directly until KV re-populates.
3. **Respect Rate Limits:** When polling `/api/stats/live`, maintain at least a 10-second polling interval and obey HTTP 429 backoff headers.
4. **Use MCP for Pair Programming:** Point your AI agent client (Cursor, Claude Desktop, Antigravity) to `http://localhost:5173/api/mcp` using the Bearer token for autonomous link generation.
