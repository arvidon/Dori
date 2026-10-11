# Dori

Dori is a ChatGPT-style AI assistant. Users sign in with Google, chat with an
LLM router that picks a specialist agent (chat, web search, coding, PDF, PPT,
image generation, PDF Q&A, image analysis), and get results back in the chat.
Generated code and documents open in a side "Artifact" panel. Paid plans are
bought through Razorpay and add credits.

This README describes how the repository is laid out, how a request travels
through the system, and what to know before changing it.

---

## Contents

1. [Repository layout](#repository-layout)
2. [Architecture at a glance](#architecture-at-a-glance)
3. [Services](#services)
4. [Request lifecycle](#request-lifecycle)
5. [Agents and the LangGraph workflow](#agents-and-the-langgraph-workflow)
6. [Auth, sessions and credits](#auth-sessions-and-credits)
7. [Billing](#billing)
8. [Rate limits](#rate-limits)
9. [Data stores](#data-stores)
10. [Frontend](#frontend)
11. [Configuration](#configuration)
12. [Running locally](#running-locally)
13. [Deployment](#deployment)
14. [Known issues and things to fix](#known-issues-and-things-to-fix)

---

## Repository layout

```
Dori/
├── .github/workflows/deploy.yml   CI/CD: build Docker images, push to ECR, redeploy ECS; build frontend, sync to S3, invalidate CloudFront
├── backend/
│   ├── package.json               Root deps (ioredis), shared by all services at build time
│   ├── docker-compose.yml         Local Redis on :6379
│   ├── shared/redis/redis.js      One ioredis client used by gateway, auth, agents
│   ├── gateway/                   Public API gateway (Express + express-http-proxy)
│   │   ├── index.js               Routes, CORS, proxying
│   │   ├── middleware/auth.middleware.js   Session cookie -> Redis lookup
│   │   ├── controller/user.controller.js   GET /api/me
│   │   └── utils/proxyWithHeader.js        Proxy that adds x-user-id
│   └── services/
│       ├── auth/                  Login, sessions, users, credits, plan updates (Firebase + MongoDB + Redis)
│       ├── chat/                  Conversations and messages (MongoDB)
│       ├── agents/                AI brain: router + LangGraph agents, file handling, S3 uploads
│       └── billing/               Razorpay orders and payment verification
└── frontend/                      React 19 + Vite + Tailwind SPA
    └── src/
        ├── App.jsx, main.jsx      Entry points, Redux Provider
        ├── pages/Home.jsx         Login gate + layout (sidebar, chat, artifact panel)
        ├── components/            Sidebar, chat input, message list/bubbles, artifact viewer, billing drawer
        ├── features/              Thin API wrappers (one file per endpoint)
        ├── redux/                 Slices: user, conversation, message
        └── ../utils/              axios instance (cookies on), Firebase client setup
```

Notes on the layout:

- Each backend service has its own `package.json` and `Dockerfile`. The
  Dockerfiles use the `backend/` folder as the build context so they can copy
  in `shared/`.
- `backend/gateway/node_modules` and other `node_modules` folders are tracked
  in git by accident. See [Known issues](#known-issues-and-things-to-fix).

---

## Architecture at a glance

```
                       ┌──────────────────────────┐
  Browser (React SPA)  │  CloudFront + S3 (static) │
          │            └──────────────────────────┘
          │  HTTPS, cookie "session" (credentials: include)
          ▼
┌──────────────────────────────────────────────────────────────┐
│ Gateway  (Express, :8000)                                     │
│  • CORS allow-list (FRONTEND_URL)                             │
│  • cookie -> Redis session lookup (protect middleware)        │
│  • injects x-user-id header and proxies to services           │
└──┬─────────────┬──────────────┬──────────────┬───────────────┘
   │ /api/auth   │ /api/chat    │ /api/agents  │ /api/billing
   │ (no auth    │ (protected)  │ (protected)  │ (protected)
   ▼             ▼              ▼              ▼
┌────────┐  ┌────────┐   ┌────────────┐  ┌─────────┐
│ Auth   │  │ Chat   │   │ Agents     │  │ Billing │
│ :8001  │  │ :800x  │   │ :8002      │  │ :800x   │
└──┬──┬──┘  └───┬────┘   └─┬──┬──┬──┬──┘  └────┬────┘
   │  │         │          │  │  │  │          │
   │  │         │          │  │  │  └─ Tavily (web search)
   │  │         │          │  │  └──── S3 (generated files, uploads)
   │  │         │          │  └─────── Qdrant (PDF vectors)
   │  │         │          └────────── Groq / OpenRouter / Google embeddings / pollinations.ai
   │  │         │                                   
   │  ▼         ▼                       
   │ MongoDB  (users, conversations, messages, payments)
   ▼
 Firebase Admin (verify Google ID tokens)        Redis (sessions, rate-limit counters, message cache)
```

Every backend service is a small Express app that reads its port from `PORT`.
Services call each other over HTTP using URLs from environment variables
(`AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE`).

---

## Services

### Gateway (`backend/gateway`)

The only thing the browser talks to. Responsibilities:

| Route | Behaviour |
| --- | --- |
| `/api/auth/update-plan` | Returns 404 on purpose. Only billing should call it, service to service. |
| `/api/auth/*` | Proxied to the auth service without the session check (login, logout, deduct-credits). |
| `/api/chat/*` | Session required. Proxied to chat with `x-user-id`. |
| `/api/agents/*` | Session required. Proxied as a raw buffer (multipart uploads), 21 MB body limit. |
| `/api/billing/*` | Session required. Proxied to billing with `x-user-id`. |
| `GET /api/me` | Session required. Returns the session object with `_id` set to `userId`. |
| `GET /` | Health message. |

`protect` (in `middleware/auth.middleware.js`) reads the `session` cookie,
looks up `session-<id>` in Redis, and puts the parsed session on `req.user`.
`proxyWithHeader` copies `req.user.userId` into the `x-user-id` header. Downstream
services trust that header. **Only the gateway should be reachable from the
internet**, which is why the other services must sit behind it.

### Auth (`backend/services/auth`)

- `POST /api/auth/login` — takes a Firebase ID token, verifies it with
  Firebase Admin, finds or creates the `User` in MongoDB (100 free credits),
  creates a random session ID, stores the session in Redis for 7 days, and sets
  an `httpOnly` `session` cookie.
- `POST /api/auth/logout` — deletes the Redis session and clears the cookie.
- `POST /api/auth/deduct-credits` — called by the agents. Decreases credits by
  the agent's cost and refreshes the cached session in Redis.
- `POST /api/auth/update-plan` — called by billing after a verified payment.
  Idempotent: it stores each Razorpay payment ID in `appliedPaymentIds`, so a
  retry cannot add credits twice.

The `User` schema has `plan` (default `free`), `credits`, `totalCredits`,
`planExpiresAt`, and `appliedPaymentIds`.

### Chat (`backend/services/chat`)

Plain CRUD over two MongoDB collections:

- `Conversation` — `title` (default "New Chat"), `userId`. Sorted by `updatedAt`.
- `Message` — `conversationId`, `role` (`user` | `assistant`), `content`,
  `images[]`, `artifacts[]` (each artifact has `id`, `type`, `title`, `files[]`
  of `{name, content}`).

Endpoints: `GET /create-conversation`, `GET /get-conversations`,
`POST /update-conversation`, `POST /save-messages`, `GET /get-messages/:conversationId`.

Note that `userId` comes from the `x-user-id` header, so the chat service
trusts the gateway completely.

### Agents (`backend/services/agents`)

This is the core of the product. See [Agents and the LangGraph workflow](#agents-and-the-langgraph-workflow).

Endpoint: `POST /chat` (multipart, field `file` for one optional PDF or image,
max 20 MB, enforced by multer).

### Billing (`backend/services/billing`)

- `POST /create` — creates a Razorpay order for a plan (`starter` ₹199,
  `pro` ₹499) and stores a `Payment` with status `created`.
- `POST /verify` — checks the Razorpay signature with HMAC-SHA256
  (`order_id|payment_id`, using `timingSafeEqual`), then calls auth's
  `/update-plan`, and marks the payment `paid`.

Plan definitions live in `config/plans.js`:

| Plan | Price (INR) | Credits | Validity |
| --- | --- | --- | --- |
| free | 0 | 100 | 30 days |
| starter | 199 | 500 | 30 days |
| pro | 499 | 1000 | 30 days |

---

## Request lifecycle

What happens when a user sends "make me a PDF about black holes":

1. **Frontend** (`chatInputs.jsx`) builds a `FormData` with `prompt`,
   `conversationId`, `agent` (the selected chip, or `auto`) and an optional
   `file`. It calls `POST /api/agents/chat` through the axios instance, which
   sends cookies.
2. **Gateway** checks the `session` cookie in Redis, adds `x-user-id`, and
   forwards the raw multipart body to the agents service.
3. **Agents controller** (`controller/agent.controller.js`):
   1. Appends the user message to the Redis message cache (`messages-<conversationId>`).
   2. Saves the user message to the chat service (`/save-messages`).
   3. Runs the LangGraph `graph.invoke({ prompt, conversationId, agent, userId, file })`.
   4. Saves the assistant reply and any artifacts to the chat service, and
      appends it to the Redis cache.
   5. Returns `{ answer, images, artifacts }`. Deletes the uploaded temp file in `finally`.
4. **Graph** routes to a node (see below). The node checks the rate limit, does
   its work, calls `deductCredits`, and returns `aiResponse` and optional
   `images` / `artifacts`.
5. **Frontend** adds the answer to the Redux message list. If there are
   artifacts, `setArtifacts` opens the side panel. The sidebar and the user's
   credit count refresh from `/api/me`.

Conversations are created with `GET /api/chat/create-conversation` when the user
clicks "new chat". The chat service returns the document, and the frontend puts it in
the conversation slice.

---

## Agents and the LangGraph workflow

The graph is defined in `services/agents/graph/graph.js` using
`@langchain/langgraph`'s `StateGraph`. The shared state (`graph/state.js`) has:

`prompt`, `aiResponse`, `agent`, `conversationId`, `searchResults`, `images`,
`artifacts`, `userId`, `file`.

```
            __start__
                │
             router  ── decides agent (see below)
                │
   ┌────┬───┬───┼────┬─────────┬──────────┬───────────┐
   ▼    ▼   ▼   ▼    ▼         ▼          ▼           ▼
 chat search coding pdf  ppt  imageGen  pdfRag  imageAnalyzer
   │    │                                  
   │    └──► chat (search results go into chat's system prompt)
   ▼
 __end__
```

### Router (`graph/router.js`)

1. If the client chose an agent (not `auto`), use it. Aliases map
   `imagegen`, `pdfrag`, `imageanalyzer` to their node names.
2. If a file is attached, a PDF goes to `pdfRag` and an image goes to
   `imageAnalyzer`. This runs before the LLM.
3. Otherwise, an LLM (Groq `openai/gpt-oss-120b`) is given a classification
   prompt and must return exactly one label: `chat`, `search`, `coding`, `pdf`,
   `ppt`, or `imageGen`. Anything unknown falls back to `chat`.

### Agent nodes (`services/agents/agents/`)

| Node | File | What it does | Model | Credit cost |
| --- | --- | --- | --- | --- |
| `chat` | `chat.agent.js` | Answers with the last 20 messages of history. Uses Dori's system prompt and any search results. | Groq gpt-oss-120b | 1 |
| `search` | `searcha.agent.js` | Runs Tavily (5 results + images), then hands off to `chat`. | Tavily + chat LLM | 2 |
| `coding` | `coding.agent.js` | Two steps. A small intent classifier (`CODE_GENERATION`, `DEBUGGING`, ...), then the main model returns a project as JSON `{ files: [{name, content}] }`, which becomes an artifact. | OpenRouter `deepseek/deepseek-chat` (8k output) | 2 |
| `pdf` | `pdf.agent.js` | Asks the LLM for JSON (title, sections with bullets), builds the PDF with PDFKit (`utils/generatePdf.js`), uploads to S3, returns a 10-minute link. | Groq | 2 |
| `ppt` | `ppt.agent.js` | Same pattern, but 6 slides as JSON, rendered with `pptxgenjs`. | Groq | 2 |
| `imageGen` | `image.agent.js` | LLM turns the request into a rich image prompt. Image is fetched from `image.pollinations.ai`, uploaded to S3, and returned as a 10-minute link. | Groq | 2 |
| `pdfRag` | `pdfRag.agent.js` | Extracts PDF text. Documents under 12 000 characters go straight into context. Larger ones are split (1000/200), embedded with Gemini (`gemini-embedding-001`) into a per-request Qdrant collection, and the top 5 chunks are used. Answers only from the PDF. | Groq | 2 |
| `imageAnalyzer` | `imageAnalyzer.js` | Sends the image as base64 to a vision model. | Groq vision (`qwen/qwen3.8-27b` by default) | 2 (uses the `image` limit and cost key) |

Each node follows the same pattern:

```js
await checkAgentLimit(state.userId, "<limit key>")   // throws 429 if over limit
// ... do the work ...
await deductCredits(state.userId, "<agent>")         // POST to auth
return { ...state, aiResponse, artifacts?, images? }
```

On error most nodes catch the exception and return a friendly `aiResponse`
instead, so the request still succeeds. The 429 rate-limit error is the one
case that is returned as an HTTP error by the global error handler in
`index.js`.

Each file-generating node uploads to S3 under `pdfs/<filename>` (the same
prefix is used for PPT and images) and returns a presigned URL that expires in
10 minutes (`getFromS3`).

### Model configuration (`config/llmModels.js`)

`getModel(name)` returns a LangChain chat model. Right now it is a simple
switch: `coding` uses OpenRouter, `imageAnalyzer` uses the Groq vision model,
and everything else (including unknown names) uses Groq. Swapping a model is a
one-line change here.

### Search (`config/tavily.js`)

`TavilySearch` with `maxResults: 5`, `topic: "general"`, `includeImages: true`.

### Memory (`config/memory.js`)

Conversation context lives in Redis under `messages-<conversationId>`, with a
24-hour TTL and at most 20 messages. On a cache miss, it reloads history from
the chat service. Both the controller and the chat agent use this cache.

---

## Auth, sessions and credits

Sign-in flow:

1. The frontend uses the Firebase JS SDK (`utils/firebase.js`, Google popup)
   to get an ID token.
2. It sends the token to `POST /api/auth/login`.
3. The auth service verifies it with Firebase Admin, finds or creates the
   user, and writes two Redis keys:
   - `session-<sessionId>` → JSON snapshot of the user (7-day TTL)
   - `user-session-<mongoId>` → `{ sessionId }`, so the server can find the
     session for a user (used when credits or plans change)
4. The browser keeps only the opaque `session` cookie (httpOnly, secure,
   SameSite=None). The rest of the app sees the user through `/api/me`.

Because the session is a Redis snapshot, **credits and plan data are cached
there**. Whenever credits change, the code writes the snapshot again
(`deductCredits`, `updateUserPayment`). The frontend reads it from `/api/me`.

Credit costs are defined in two places that must agree: the `COST` table in
`auth.controller.js` (used for `deductCredits`) and the per-agent calls in the
agent nodes. If a new agent is added, both need an entry.

---

## Billing

```
Browser ─ POST /api/billing/create {plan} ─► Billing ─► Razorpay (create order)
   │                                          │ store Payment(status=created)
   ◄──────────── order ──────────────────────┘
   │
   │ opens Razorpay checkout (billingDrawer.jsx, key from VITE_RAZORPAY_KEY_ID)
   │
Browser ─ POST /api/billing/verify {order_id, payment_id, signature} ─► Billing
                                             │ HMAC check, match user + order
                                             │ POST auth /api/auth/update-plan (idempotent)
                                             │ Payment(status=paid)
   ◄────────────── success ──────────────────┘
```

The price is set on the server from `plans.js`, not sent by the client.
Verification uses the Razorpay signature. Credits are only added by the
`update-plan` call, and that call is protected from double-counting by
`appliedPaymentIds`.

---

## Rate limits

`config/agentLimit.js` uses a Redis fixed window: `INCR rate:<userId>:<agent>`,
with a 60-second `EXPIRE` set on the first hit. The limits are:

| Key | Requests / minute |
| --- | --- |
| chat | 20 (also the default for unknown keys) |
| coding | 5 |
| pdf | 5 |
| ppt | 5 |
| image | 3 |
| search | 5 |

Over the limit, it throws an error with status 429 and a `retryAfter`
message, which the frontend shows.

---

## Data stores

| Store | Used for | Where |
| --- | --- | --- |
| **MongoDB** (Mongoose) | `users`, `conversations`, `messages`, `payments` | Auth, Chat, Billing, and Agents' `config/db.js` |
| **Redis** (ioredis) | Sessions, user→session map, rate-limit counters, message cache | Gateway, Auth, Agents |
| **S3** | Generated PDFs, PPTs, images (`pdfs/` prefix) | Agents (`config/s3.js`). Uses static keys if set, else the ECS task role. |
| **Qdrant** | Vectors for large PDFs, one collection per request | Agents (`config/vectorDb.js`) |
| **Firebase Auth** | Identity (Google sign-in) | Frontend and Auth |

Each Mongo-backed service has its own `config/db.js` that connects using
`MONGODB_URL`. Services only share Redis through `shared/redis/redis.js`.

---

## Frontend

- **Stack:** React 19, Vite 8, Tailwind CSS 4, Redux Toolkit, React Markdown
  with GFM, Monaco editor (`@monaco-editor/react`) and react-syntax-highlighter
  for code, Motion for animation, lucide/react-icons.
- **State:** three slices:
  - `user` — `userData` (from `/api/me`)
  - `conversation` — list, selected conversation
  - `message` — messages, artifacts, `isLoading`
- **API calls:** `utils/axios.js` is an axios instance with `baseURL = VITE_SERVER_URL`
  and `withCredentials: true`, so the session cookie is sent. Each
  `features/*.js` file wraps one endpoint.
- **Layout (`pages/Home.jsx`):** a sidebar (conversations, new chat, logout),
  the chat column, and the Artifact panel on the right. If there is no user,
  a login modal covers the screen.
- **Artifacts (`components/Artifact.jsx`):** the first artifact of the latest
  message is shown. Its files are listed as tabs. HTML can be previewed in an
  iframe, and code is shown in an editor view. Artifacts come from coding
  agent output.
- **Chat input (`chatInputs.jsx`):** the agent chips (auto, chat, search,
  coding, PDF, PPT, image generation) and file attachment, which also sets the
  `agent` field.

Dev server: `npm run dev` in `frontend/`. Build: `npm run build` (outputs `dist/`).

---

## Configuration

Each service reads a `.env` file (through `dotenv`) and the process environment.
The `.env` files are git-ignored. The variables found in the code are:

**All services**

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (gateway 8000, auth 8001, agents 8002 in the Dockerfiles; set per environment) |
| `REDIS_URL` | Redis connection string |

**Gateway**

| Variable | Purpose |
| --- | --- |
| `FRONTEND_URL` | Comma-separated CORS origins |
| `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE` | Base URLs of the downstream services |

**Auth**

| Variable | Purpose |
| --- | --- |
| `MONGODB_URL` | Users database |
| `AUTH_SERVICE` | Not read by auth itself, but used by billing and agents to call auth |

**Chat / Agents / Billing**

| Variable | Purpose |
| --- | --- |
| `MONGODB_URL` | Their database |
| `CHAT_SERVICE` | (agents) where to save and load messages |
| `AUTH_SERVICE` | (agents, billing) where to deduct credits / update plans |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Billing |
| `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_KEY` | S3 (keys optional on ECS) |
| `QDRANT_URL`, `QDRANT_API_KEY` | Vector store for PDF RAG |
| `GROQ_VISION_MODEL` | Optional override for the vision model |

Third-party libraries also read their own keys from the environment:
`GROQ_API_KEY` (Groq), `OPENROUTER_API_KEY` (OpenRouter), `GOOGLE_API_KEY`
(Gemini embeddings), `TAVILY_API_KEY` (Tavily).

**Frontend (build time, `VITE_*`)**

| Variable | Purpose |
| --- | --- |
| `VITE_SERVER_URL` | Gateway base URL |
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key |

Firebase Admin uses `services/auth/serviceAccountKey.json`. See the warning in
[Known issues](#known-issues-and-things-to-fix).

---

## Running locally

Prerequisites: Node 20+ (the Dockerfiles use the latest `node` image), Redis
(`docker compose up -d` in `backend/` starts one on port 6379), MongoDB, and
API keys for the services you want to try.

```bash
# Backend: install and start each service (each in its own terminal)
cd backend/gateway        && npm install && npm start
cd backend/services/auth    && npm install && npm start
cd backend/services/chat    && npm install && npm start
cd backend/services/agents  && npm install && npm start
cd backend/services/billing && npm install && npm start

# Frontend
cd frontend && npm install && npm run dev
```

The services currently have no `dev` script except agents (`nodemon`). Run each
with its own `.env` and make sure the `*_SERVICE` URLs match the ports you chose.
Add `http://localhost:5173` to `FRONTEND_URL` for the dev server. The session cookie is
`SameSite=None; Secure`, so local HTTP login may need the cookie settings
adjusted, or testing against a HTTPS deployment.

There are no automated tests. The `test` script in `backend/package.json` is a placeholder.

---

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`:

1. **deploy-backend**
   - Builds Docker images for `gateway`, `auth`, `chat`, `agents`, `billing`
     (`linux/amd64`), tags them, and pushes them to ECR.
   - Runs `aws ecs update-service --force-new-deployment` for each service.
2. **deploy-frontend** (after the backend job)
   - Builds the Vite app with `VITE_*` values from GitHub secrets.
   - `aws s3 sync frontend/dist` to the bucket (with `--delete`).
   - Invalidates CloudFront `/*`.

Required GitHub secrets include the AWS keys and region, ECR account ID, ECS
cluster and service names, the S3 bucket, the CloudFront distribution ID, and the
`VITE_*` values. The Dockerfiles run `npm install` in each service folder and
copy `backend/shared` into the image.

---

## Known issues and things to fix

These came up while writing this file. Treat them as a to-do list.

1. **A Firebase service account key is committed to git.**
   `backend/services/auth/serviceAccountKey.json` is tracked. Anyone with repo
   access can use it. Rotate the key in the Firebase console, delete the file
   from the repo, load it from an environment variable or a secret instead, and
   consider scrubbing it from the git history.

2. **`/api/auth/deduct-credits` is reachable from the internet.**
   The gateway only blocks `/api/auth/update-plan`. The route proxies everything
   else under `/api/auth` without a session check, and `deduct-credits` takes
   `userId` from the request body. Anyone who knows a user's Mongo ID can drain
   their credits. Those routes should be internal only, or they should require a
   shared secret or the gateway's session check.

3. **Credits are read-modify-write.** `deductCredits` loads the user, subtracts,
   and saves. Two concurrent requests can both see the same balance. Use an
   atomic `$inc` with a `credits >= cost` condition.

4. **Credits are deducted after the work, and some agents skip the deduction on
   error.** A user can get a result without being charged, and an error path
   never charges. This is probably intentional, but it should be a deliberate choice.

5. **Trust in `x-user-id`.** Chat, billing and agents trust this header. That is
   safe only while those services are unreachable from outside the gateway. Check
   the ECS security groups.

6. **Session check returns 400 for unauthenticated requests.** The gateway's
   `protect` middleware returns 400 for "unauthorized" and "session expired"
   where 401 is the usual status, so the frontend cannot tell these from other
   client errors.

7. **Login from another device** replaces the `user-session-<id>` pointer, but
   older session keys stay valid until their TTL expires. Logout only deletes
   the current session.

8. **Stray files in git.** `backend/services/agents/temp/` contains a file with
   a mangled name, and `node_modules/` folders are committed (for example
   `backend/gateway/node_modules`). `.gitignore` already excludes them, so they
   need `git rm --cached`. `.DS_Store` files are tracked too.

9. **Duplicate Dockerfile naming.** `services/agents/.dockerfile` and
   `services/billing/.dockerfile` are stray copies. The real files are
   `Dockerfile`.

10. **Unused or inconsistent bits.** `getModel` is called with `"intent"`,
    `"pdf-rag"`, and `"ppt"`, which are not cases in its switch (they fall back
    to Groq, which works but is implicit). `checkAgentLimit` for `imageAnalyzer`
    uses the `image` key. `coding` and `ppt` call `JSON.parse` on raw LLM
    output without a fallback, so malformed JSON becomes a generic failure
    message. `getMemory` assumes `getMessages` returns an array, but it returns
    `null` on error, which would make `slice` throw.

11. **Health message is a version string.** `gateway` returns
    `hello from gateway v5555555663`. It should be replaced with something useful
    or removed.

12. **No tests and no linting in the backend.**

---

## Glossary

- **Agent** — one specialist node in the LangGraph graph.
- **Artifact** — a generated set of files (code project) shown in the side panel.
- **Router** — the first graph node. It picks the agent for a message.
- **Session** — a Redis record keyed by an opaque cookie value. It holds the user's
  identity, plan and credits.
- **Credits** — the currency that agents spend. Each user starts with 100.
