# Backend Authentication Implementation

## Overview
This document describes the complete email/password and OAuth authentication system for the Hotel-App backend.

## Installation

```bash
cd backend
npm install jsonwebtoken @types/jsonwebtoken
```

## Database Migration

Apply the migration to add password support:

```bash
psql -U hotel_app -d hotel_app -f database/migrations/008_add_password_hash.sql
```

Or if using Docker Compose:

```bash
docker exec -i hotel_postgres psql -U hotel_app -d hotel_app < database/migrations/008_add_password_hash.sql
```

## Environment Variables

Add these to your `backend/.env`:

```env
JWT_SECRET=your-random-secret-at-least-32-characters
JWT_REFRESH_SECRET=your-different-random-secret-at-least-32-characters
ADMIN_EMAIL=admin@example.com
ADMIN_LOGIN_PASSWORD=AdminPassword123!
```

## Seed Admin User

```bash
cd backend
npx tsx src/scripts/seed-admin.ts
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 client ID
3. Add authorized redirect URI: `http://localhost:5173/api/v1/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5173/api/v1/auth/google/callback
   ```

## API Endpoints

### Register (Email + Password)
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -c cookies.txt \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "phone": "0821234567"
  }'
```

**Response (201):**
```json
{
  "user": {
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "email_verified": true,
    "phone": "0821234567"
  }
}
```

### Login (Email + Password)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "Password123!"
  }'
```

**Response (200):**
```json
{
  "user": {
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "email_verified": true,
    "phone": "0821234567"
  }
}
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Origin: http://localhost:5173" \
  -b cookies.txt
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Origin: http://localhost:5173" \
  -b cookies.txt \
  -c cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Origin: http://localhost:5173" \
  -b cookies.txt
```

### Logout All Sessions
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout-all \
  -H "Origin: http://localhost:5173" \
  -b cookies.txt
```

### Google OAuth Flow
1. Redirect user to: `http://localhost:3000/api/v1/auth/google`
2. User authenticates with Google
3. Redirect to callback with cookies set automatically

## Test Checklist

### Registration Tests
- [ ] Valid registration succeeds (201)
- [ ] Duplicate email returns 409 with EMAIL_EXISTS error
- [ ] Weak password (< 8 chars) returns 400 with WEAK_PASSWORD error
- [ ] Password without uppercase returns 400 with WEAK_PASSWORD error
- [ ] Password without lowercase returns 400 with WEAK_PASSWORD error
- [ ] Password without number returns 400 with WEAK_PASSWORD error
- [ ] Password without special char returns 400 with WEAK_PASSWORD error
- [ ] Passwords don't match returns 400 with PASSWORD_MISMATCH error
- [ ] Invalid phone format returns 400 with INVALID_PHONE error
- [ ] Name < 2 chars returns 400 with INVALID_NAME error
- [ ] Name > 100 chars returns 400 with INVALID_NAME error

### Login Tests
- [ ] Valid credentials return 200 with user object
- [ ] Wrong email returns 401 with generic "Invalid email or password"
- [ ] Wrong password returns 401 with generic "Invalid email or password"
- [ ] Google-only user (no password) trying password login returns 400 with OAUTH_ONLY_ACCOUNT error
- [ ] Inactive user returns 403 with ACCOUNT_DEACTIVATED error

### Session Tests
- [ ] Refresh token generates new access token
- [ ] Refresh token rotation works (old token revoked)
- [ ] Expired refresh token returns 401
- [ ] Logout clears cookies and revokes token
- [ ] Logout-all revokes all user tokens

### OAuth Tests
- [ ] Google sign-in creates new user with oauth_provider='google'
- [ ] Google sign-in links to existing email account
- [ ] Google sign-in for existing Google user logs them in
- [ ] Facebook sign-in creates new user with oauth_provider='facebook'
- [ ] Facebook sign-in links to existing email account

### Admin Tests
- [ ] Admin seed creates admin user
- [ ] Admin seed updates existing user to admin role
- [ ] Admin middleware blocks non-admin users (403)
- [ ] Admin middleware blocks unauthenticated users (401)
- [ ] Public registration cannot create admin users
- [ ] OAuth sign-in cannot create admin users

### Security Tests
- [ ] Password never returned in responses
- [ ] Tokens never returned in responses (only in cookies)
- [ ] Cookies are httpOnly
- [ ] Rate limiting works (5 attempts per 15 minutes)
- [ ] CORS allows only APP_ORIGIN
- [ ] SQL injection prevented (parameterized queries)

## Session Design

**Access Token:**
- JWT stored in httpOnly cookie
- 15 minute expiry
- Contains: userId, email, role

**Refresh Token:**
- JWT stored in httpOnly cookie
- 7 day expiry
- Hashed in database
- Rotated on each use (old token revoked)
- All tokens revoked on logout-all

**Rationale:**
- Short-lived access tokens reduce damage if leaked
- Refresh tokens allow long sessions without re-authentication
- Token rotation prevents replay attacks
- Database storage allows revocation (logout, logout-all)
- httpOnly cookies prevent XSS token theft
- SameSite lax prevents CSRF

## Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Status codes:
- 400: Validation errors
- 401: Authentication required
- 403: Forbidden (wrong role)
- 404: Resource not found
- 409: Conflict (duplicate email)
- 422: Unprocessable entity
- 429: Rate limited
- 500: Internal server error
