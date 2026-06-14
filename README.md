# URL Shortener Backend

NestJS backend for an account-based URL shortener. Users sign in with Google, create permanent short URLs under their own account, choose custom aliases, search saved links, and resolve redirects through Redis cache with MongoDB as the source of truth.

## Stack

- Node.js 20.11+ + NestJS + TypeScript
- MongoDB with Mongoose
- Redis cache for redirect lookups
- Google login with backend ID token verification
- JWT application sessions
- class-validator DTO validation

## Setup

```bash
nvm use
npm install
cp .env.example .env
npm run deps:up
npm run dev
```

This workspace includes `.nvmrc` for the local Node 25 runtime. Any Node version `>=20.11.0` works.

Required services:

```bash
mongodb://127.0.0.1:27017/url_shortner
redis://127.0.0.1:6379
```

Update `.env` if your local MongoDB or Redis runs elsewhere.

## Scripts

```bash
npm run dev        # start NestJS development server with watch mode
npm run deps:up    # start MongoDB and Redis through Docker Compose
npm run deps:down  # stop local Docker dependencies
npm run build      # build NestJS app to dist/
npm start          # run compiled server
npm test           # typecheck
npm run typecheck  # compile-check without emitting files
```

## Frontend

The React frontend lives in `frontend/`.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

The frontend calls the backend at `VITE_API_BASE_URL`, which defaults to:

```text
http://localhost:4000
```

Google login needs the same OAuth Web Client ID in both apps:

```bash
# backend .env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## API

### Auth

`POST /api/auth/google`

```json
{
  "credential": "google-id-token-from-google-identity-services"
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "mongodb-id",
      "name": "Ayush",
      "email": "ayush@example.com"
    },
    "accessToken": "jwt-token"
  }
}
```

Use the token as:

```http
Authorization: Bearer jwt-token
```

### URLs

`POST /api/urls`

```json
{
  "originalUrl": "https://example.com/long/path",
  "customAlias": "launch-page"
}
```

`customAlias` is optional. If supplied, it becomes the public short code. Aliases are normalized to lowercase and support letters, numbers, hyphens, and underscores.

`GET /api/urls?search=launch&page=1&limit=20`

Lists the authenticated user's saved URLs forever unless they are deleted/deactivated.

`GET /api/urls/custom-names/search?q=launch&limit=10`

Searches the authenticated user's custom aliases.

`GET /api/urls/:id`

Fetches one saved URL owned by the authenticated user.

`PATCH /api/urls/:id`

```json
{
  "originalUrl": "https://example.com/new-target",
  "customAlias": "new-name"
}
```

Set `customAlias` to `null` to remove the custom name and generate a new random short code.

`DELETE /api/urls/:id`

Soft-deactivates the URL and clears its cache entry.

### Redirect

`GET /:shortCode`

Redirects to the original URL. Redis is checked first; MongoDB is used on cache miss and then repopulates Redis.

## Architecture

```text
src/
  main.ts                 # Nest bootstrap, global pipes/filters, security middleware
  app.module.ts           # root Nest module
  config/                 # typed environment config
  redis/                  # Redis module and provider
  common/                 # decorators, filters, pipes, shared request types
  modules/
    auth/                 # auth controller, service, JWT guard, DTOs
    users/                # user schema, module, service
    urls/                 # URL controller, service, schema, DTOs, utilities
    health/               # health endpoint
    redirect/             # public /:shortCode redirect endpoint
```
