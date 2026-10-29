# OAuth Authentication Setup Guide

This guide explains how to configure OAuth authentication (Google and Facebook) for the Hotel Application.

## Overview

The application supports three authentication methods:
1. **Email OTP** - Passwordless sign-in via email verification codes
2. **Google OAuth** - Sign in with Google account
3. **Facebook OAuth** - Sign in with Facebook account

At least one method must be configured for users to sign in. You can enable multiple methods simultaneously.

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Create OAuth 2.0 Credentials

1. Click **Create Credentials** > **OAuth client ID**
2. Configure the consent screen if prompted:
   - Choose **External** user type
   - Add app name, user support email, and developer contact
   - Add scopes: `email`, `profile`
3. Select **Web application** as application type
4. Add authorized redirect URIs:
   - Development: `http://localhost:5173/api/v1/auth/google/callback`
   - Production: `https://yourdomain.com/api/v1/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**

### Step 3: Configure Backend

Add the following to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5173/api/v1/auth/google/callback
```

## Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developer Portal](https://developers.facebook.com/apps)
2. Click **Create App** > **Consumer** (or select appropriate type)
3. Add app name and contact email

### Step 2: Configure Facebook Login

1. Navigate to **App Review** > **App Settings** > **Basic**
2. Add your app domains:
   - Development: `localhost:5173`
   - Production: `yourdomain.com`
3. Navigate to **Products** > **Facebook Login** > **Settings**
4. Add valid OAuth redirect URIs:
   - Development: `http://localhost:5173/api/v1/auth/facebook/callback`
   - Production: `https://yourdomain.com/api/v1/auth/facebook/callback`
5. Enable **Web OAuth Login**
6. Copy the **App ID** and **App Secret**

### Step 3: Configure Backend

Add the following to `backend/.env`:

```env
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5173/api/v1/auth/facebook/callback
```

## Testing OAuth

1. Restart the backend server after updating `.env`
2. Navigate to the login page
3. Click "Sign in with Google" or "Sign in with Facebook"
4. Complete the OAuth flow in the popup
5. You should be redirected back to the app and signed in

## Troubleshooting

### OAuth returns 503 error

- Verify that the OAuth credentials are correctly set in `backend/.env`
- Check that the callback URL matches exactly what's configured in the OAuth provider

### Redirect URI mismatch

- Ensure the callback URL in `.env` matches the authorized redirect URI in the OAuth provider console
- For development, use `http://localhost:5173/api/v1/auth/{provider}/callback`
- For production, use `https://yourdomain.com/api/v1/auth/{provider}/callback`

### Email not verified after OAuth

- OAuth automatically verifies the email from the provider
- Check that the OAuth provider is returning the email in the profile
- Ensure the `upsertVerifiedUser` function is working correctly

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables for all secrets
- In production, use HTTPS for all OAuth callbacks
- Regularly rotate OAuth secrets
- Monitor OAuth provider dashboards for suspicious activity
