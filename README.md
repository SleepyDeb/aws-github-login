# OAuth2 PKCE Authentication for React

A complete, secure OAuth2 authentication implementation with PKCE (Proof Key for Code Exchange) support for React applications.

## 🚀 Features

- **OAuth2 with PKCE**: Secure authentication flow following RFC 7636
- **OpenID Connect Discovery**: Automatic endpoint discovery from `.well-known/openid-configuration`
- **Generic Provider Support**: Works with any OAuth2 provider that supports PKCE and OIDC discovery
- **Persistent Sessions**: localStorage-based session management with automatic expiration
- **React Integration**: Context provider, hooks, and components for seamless React integration
- **TypeScript Ready**: Well-documented interfaces and comprehensive error handling
- **Production Ready**: Comprehensive error handling, security best practices, and performance optimizations

## 📋 Requirements

- React 18+
- Modern browser with Web Crypto API support
- OAuth2 provider that supports:
  - PKCE (RFC 7636)
  - OpenID Connect Discovery (RFC 8414)
  - CORS-enabled endpoints

## 🔧 Installation

1. **Environment Variables**: Create a `.env` file with your OAuth provider configuration:

```bash
# Required OAuth2 Configuration
VITE_OAUTH_AUTHORITY=https://your-provider.com
VITE_OAUTH_CLIENT_ID=your-client-id
VITE_OAUTH_SCOPE=openid profile email

# Optional
VITE_REDIRECT_URI=http://localhost:3000
```

2. **Install Dependencies**: The implementation uses only React built-ins and Web APIs - no additional dependencies required.

3. **Import Components**: Add the authentication provider to your app:

```jsx
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import LoginButton from './components/LoginButton.jsx';
import LogoutButton from './components/LogoutButton.jsx';

function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}
```

## 🏗️ Architecture

```
src/
├── utils/
│   └── pkceUtils.js              # PKCE code generation utilities
├── services/
│   ├── oidcDiscovery.js          # OpenID Connect discovery
│   ├── sessionManager.js         # Session storage management
│   └── oauth2Service.js          # Main OAuth2 service
├── contexts/
│   └── AuthContext.jsx           # React authentication context
├── hooks/
│   └── useAuth.js                # Authentication hooks
└── components/
    ├── LoginButton.jsx           # Login button component
    ├── LogoutButton.jsx          # Logout button component
    └── OpenConsoleButton.jsx     # Console button (placeholder)
```

## 🔐 Security Features

- **PKCE Implementation**: Protects against authorization code interception attacks
- **State Parameter**: CSRF protection for OAuth flows
- **Secure Storage**: localStorage with automatic cleanup and expiration
- **Token Validation**: Comprehensive token and session validation
- **Error Handling**: Secure error handling without exposing sensitive information

## 🚦 Usage Examples

### Basic Authentication

```jsx
import { useAuth } from './hooks/useAuth.js';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }
  
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Making Authenticated API Requests

```jsx
import { useAuthenticatedFetch } from './hooks/useAuth.js';

function ApiComponent() {
  const authenticatedFetch = useAuthenticatedFetch();
  
  const fetchUserData = async () => {
    try {
      const response = await authenticatedFetch('/api/user-data');
      const data = await response.json();
      // Handle response
    } catch (error) {
      console.error('API request failed:', error);
    }
  };
  
  return <button onClick={fetchUserData}>Fetch Data</button>;
}
```

### Conditional Rendering

```jsx
import { useAuthRender } from './hooks/useAuth.js';

function ConditionalComponent() {
  const { whenAuthenticated, whenUnauthenticated, whenLoading } = useAuthRender();
  
  return (
    <div>
      {whenLoading(<div>Loading...</div>)}
      {whenUnauthenticated(<LoginButton />)}
      {whenAuthenticated(<UserDashboard />)}
    </div>
  );
}
```

## 🔧 Configuration

### Supported OAuth2 Providers

- **Auth0**: Full support with OIDC discovery
- **Google**: Full support with OIDC discovery
- **Microsoft Azure AD**: Full support with OIDC discovery
- **Okta**: Full support with OIDC discovery
- **Custom Providers**: Any provider supporting PKCE and OIDC discovery

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_OAUTH_AUTHORITY` | Yes | OAuth2 provider base URL |
| `VITE_OAUTH_CLIENT_ID` | Yes | OAuth2 client identifier |
| `VITE_OAUTH_SCOPE` | Yes | Requested OAuth2 scopes |
| `VITE_REDIRECT_URI` | No | Redirect URI (defaults to current origin) |

## 🐛 Debugging

### Debug Console Button

In development mode, use the debug console button to view authentication state:

```jsx
import { DebugConsoleButton } from './components/OpenConsoleButton.jsx';

function DevTools() {
  return process.env.NODE_ENV === 'development' ? <DebugConsoleButton /> : null;
}
```

### Browser Developer Tools

Check the browser console for detailed logging:
- OIDC discovery process
- PKCE parameter generation
- Token exchange details
- Session management events

### Common Issues

1. **CORS Errors**: Ensure your OAuth provider allows CORS requests from your domain
2. **Invalid Client**: Verify your client ID and redirect URI configuration
3. **Scope Issues**: Check that requested scopes are allowed for your client
4. **PKCE Not Supported**: Verify your provider supports PKCE (most modern providers do)

## 🔄 OAuth2 Flow

1. **Initialization**: Service discovers endpoints from `/.well-known/openid-configuration`
2. **Login**: Generate PKCE parameters and redirect to authorization endpoint
3. **Callback**: Exchange authorization code for tokens using PKCE verifier
4. **Session**: Store tokens and user info in localStorage with expiration
5. **API Requests**: Automatic inclusion of Bearer token in authenticated requests
6. **Logout**: Clear session data and optionally redirect to provider logout

## 🛠️ Development

### Testing the Implementation

1. Set up your OAuth provider configuration in `.env`
2. Start the development server: `npm start`
3. Test the authentication flow:
   - Click "Sign In" to start OAuth flow
   - Complete authorization on provider
   - Verify successful callback and user info display
   - Test logout functionality

### Customization

The implementation is modular and highly customizable:

- **Styling**: Modify button styles or create custom components
- **Storage**: Replace localStorage with alternative storage solutions
- **Hooks**: Create custom hooks for specific use cases
- **Error Handling**: Extend error handling for your application needs

## 📚 References

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [OpenID Connect Discovery RFC 8414](https://tools.ietf.org/html/rfc8414)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## 🤝 Contributing

This implementation follows OAuth2 and PKCE specifications. When contributing:

1. Maintain security best practices
2. Follow the existing code patterns
3. Add comprehensive error handling
4. Update documentation for any changes
5. Test with multiple OAuth providers

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
