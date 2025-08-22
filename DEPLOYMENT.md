# Deployment Guide - OAuth2 PKCE React App

## GitHub Secrets Configuration

To deploy this OAuth2 PKCE React application via GitHub Actions, you need to configure the following repository secrets:

### Required Secrets

1. **Go to your GitHub repository**
2. **Navigate to Settings > Secrets and variables > Actions**
3. **Add the following Repository secrets:**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `OAUTH_AUTHORITY` | Your OAuth2 provider's base URL | `https://your-tenant.auth0.com` |
| `OAUTH_CLIENT_ID` | Your OAuth2 client identifier | `abc123def456ghi789` |
| `OAUTH_SCOPE` | Space-separated OAuth2 scopes | `openid profile email` |

### Setting Up Secrets

#### For Auth0:
```
OAUTH_AUTHORITY=https://your-tenant.auth0.com
OAUTH_CLIENT_ID=your-auth0-client-id
OAUTH_SCOPE=openid profile email
```

#### For Google OAuth:
```
OAUTH_AUTHORITY=https://accounts.google.com
OAUTH_CLIENT_ID=your-google-client-id.googleusercontent.com
OAUTH_SCOPE=openid profile email
```

#### For Microsoft Azure AD:
```
OAUTH_AUTHORITY=https://login.microsoftonline.com/your-tenant-id/v2.0
OAUTH_CLIENT_ID=your-azure-client-id
OAUTH_SCOPE=openid profile email
```

#### For Okta:
```
OAUTH_AUTHORITY=https://your-domain.okta.com
OAUTH_CLIENT_ID=your-okta-client-id
OAUTH_SCOPE=openid profile email
```

## OAuth Provider Configuration

### Required OAuth Client Settings

Your OAuth2 client must be configured with the following settings:

1. **Application Type:** Single Page Application (SPA)
2. **Grant Types:** Authorization Code with PKCE
3. **Redirect URI:** `https://your-username.github.io/your-repo-name/`
4. **CORS Origins:** `https://your-username.github.io`
5. **Token Endpoint Authentication:** None (for PKCE public clients)

### Auth0 Specific Setup

1. **Create Application:**
   - Go to Auth0 Dashboard > Applications
   - Create a new "Single Page Web Application"
   - Note the Domain and Client ID

2. **Configure Settings:**
   - **Allowed Callback URLs:** `https://your-username.github.io/your-repo-name/`
   - **Allowed Logout URLs:** `https://your-username.github.io/your-repo-name/`
   - **Allowed Web Origins:** `https://your-username.github.io`
   - **Grant Types:** Check "Authorization Code" and ensure PKCE is enabled

3. **Advanced Settings:**
   - **Grant Types:** Authorization Code, Refresh Token
   - **JsonWebToken Signature Algorithm:** RS256

### Google OAuth Setup

1. **Google Cloud Console:**
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application

2. **Configure Origins:**
   - **Authorized JavaScript origins:** `https://your-username.github.io`
   - **Authorized redirect URIs:** `https://your-username.github.io/your-repo-name/`

## Deployment Process

### Automatic Deployment

The GitHub workflow automatically deploys when:
- Code is pushed to the `main` branch
- Workflow is manually triggered from Actions tab

### Manual Deployment

1. **Go to Actions tab in your repository**
2. **Select "Build and Publish React project with GitHub Pages"**
3. **Click "Run workflow"**
4. **Wait for deployment to complete**

### GitHub Pages Setup

1. **Go to Settings > Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` (auto-created by workflow)
4. **Folder:** `/ (root)`

## Verification

After deployment, verify your setup:

1. **Visit your GitHub Pages URL:** `https://your-username.github.io/your-repo-name/`
2. **Check Configuration Display:** The app shows current OAuth settings
3. **Test Authentication Flow:**
   - Click "Sign In with OAuth"
   - Complete authorization on your provider
   - Verify successful callback and user info display
   - Test logout functionality

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure your OAuth provider allows CORS from your GitHub Pages domain
   - Add `https://your-username.github.io` to allowed origins

2. **Invalid Redirect URI:**
   - Verify redirect URI in OAuth provider matches exactly: `https://your-username.github.io/your-repo-name/`
   - Ensure no trailing slashes if your provider is strict

3. **Missing Environment Variables:**
   - Check that all three secrets are set in GitHub: `OAUTH_AUTHORITY`, `OAUTH_CLIENT_ID`, `OAUTH_SCOPE`
   - Verify secret names match exactly (case-sensitive)

4. **OAuth Provider Configuration:**
   - Ensure client is configured as "Single Page Application"
   - Verify PKCE is enabled
   - Check that required scopes are allowed

### Debug Information

The app includes debug features:
- Configuration display shows current environment variables
- Debug console button (development mode) shows session info
- Browser console logs detailed authentication flow

### Security Considerations

1. **Public Repository:** OAuth secrets are safe in GitHub Secrets even for public repos
2. **Client ID Exposure:** OAuth Client ID is public by design (safe to expose in client-side code)
3. **PKCE Security:** PKCE protects against authorization code interception
4. **No Client Secret:** Never use client secrets in browser applications

## Support

For issues:
1. Check browser console for detailed error messages
2. Verify OAuth provider configuration
3. Test with a simple OAuth testing tool first
4. Review GitHub Actions logs for build issues

## Local Development

For local development, create a `.env` file:

```bash
VITE_OAUTH_AUTHORITY=https://your-provider.com
VITE_OAUTH_CLIENT_ID=your-client-id
VITE_OAUTH_SCOPE=openid profile email
```

Note: Use `VITE_` prefix for local development, non-prefixed for GitHub Actions.