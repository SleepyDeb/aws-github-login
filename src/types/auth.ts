/**
 * TypeScript type definitions for OAuth2/OIDC authentication system
 * Provides comprehensive typing for all authentication-related data structures
 */

export interface OAuthConfig {
  /** OAuth2 authority URL (e.g., https://login.microsoftonline.com/tenant-id) */
  authority: string;
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 scopes (space-separated string) */
  scope: string;
  /** Redirect URI (defaults to current origin if not provided) */
  redirectUri?: string;
}

export interface TokenResponse {
  /** OAuth2 access token */
  access_token: string;
  /** Refresh token (if available) */
  refresh_token?: string;
  /** OpenID Connect ID token (if available) */
  id_token?: string;
  /** Token type (usually 'Bearer') */
  token_type?: string;
  /** Token expiration time in seconds */
  expires_in?: number;
  /** Granted scopes */
  scope?: string;
  /** Error code (if token request failed) */
  error?: string;
  /** Error description (if token request failed) */
  error_description?: string;
}

export interface UserInfo {
  /** Subject identifier - unique user ID */
  sub: string;
  /** User's email address */
  email?: string;
  /** Whether email is verified */
  email_verified?: boolean;
  /** User's full name */
  name?: string;
  /** User's given/first name */
  given_name?: string;
  /** User's family/last name */
  family_name?: string;
  /** User's preferred username */
  preferred_username?: string;
  /** User's profile picture URL */
  picture?: string;
  /** User's locale */
  locale?: string;
  /** User's timezone */
  zoneinfo?: string;
  /** GitHub-specific fields */
  login?: string;
  avatar_url?: string;
  /** Additional custom claims */
  [key: string]: unknown;
}

export interface AuthSession {
  /** OAuth2 access token */
  accessToken: string;
  /** Refresh token (if available) */
  refreshToken?: string;
  /** OpenID Connect ID token (if available) */
  idToken?: string;
  /** Token type (usually 'Bearer') */
  tokenType: string;
  /** Granted scopes */
  scope: string;
  /** Timestamp when the access token expires */
  expiresAt: number;
  /** Timestamp when session was created */
  createdAt: number;
  /** User information */
  user: UserInfo;
}

export interface OIDCEndpoints {
  /** OAuth2 authorization endpoint */
  authorizationEndpoint: string;
  /** OAuth2 token endpoint */
  tokenEndpoint: string;
  /** OIDC userinfo endpoint */
  userinfoEndpoint?: string;
  /** OIDC issuer identifier */
  issuer?: string;
  /** OIDC end session endpoint (logout) */
  endSessionEndpoint?: string;
  /** Supported scopes */
  supportedScopes: string[];
  /** Supported response types */
  supportedResponseTypes: string[];
  /** Supported PKCE code challenge methods */
  supportedCodeChallengeMethods: string[];
}

export interface OIDCConfiguration {
  /** OIDC issuer identifier */
  issuer: string;
  /** OAuth2 authorization endpoint */
  authorization_endpoint: string;
  /** OAuth2 token endpoint */
  token_endpoint: string;
  /** OIDC userinfo endpoint */
  userinfo_endpoint?: string;
  /** OIDC end session endpoint */
  end_session_endpoint?: string;
  /** Supported scopes */
  scopes_supported?: string[];
  /** Supported response types */
  response_types_supported?: string[];
  /** Supported PKCE code challenge methods */
  code_challenge_methods_supported?: string[];
  /** Additional OIDC configuration properties */
  [key: string]: unknown;
}

export interface AuthState {
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Current user information (null if not authenticated) */
  user: UserInfo | null;
  /** Whether an authentication operation is in progress */
  isLoading: boolean;
  /** Current authentication error (null if no error) */
  error: string | null;
  /** Whether the OAuth2 service has been initialized */
  isInitialized: boolean;
}

export interface AuthContextValue extends AuthState {
  /** Initiates the OAuth2 login flow */
  login: () => Promise<void>;
  /** Logs out the current user */
  logout: (redirectToProvider?: boolean) => Promise<void>;
  /** Refreshes the authentication state */
  refresh: () => void;
  /** Clears the current error state */
  clearError: () => void;
  /** Gets the current access token */
  getAccessToken: () => string | null;
  /** Gets the current ID token (JWT) */
  getIdToken: () => string | null;
  /** Gets debug information about the current session */
  getDebugInfo: () => AuthDebugInfo;
}

export interface AuthDebugInfo {
  /** Current session information */
  session: AuthSession | null;
  /** Authentication status */
  isAuthenticated: boolean;
  /** Debug information about session timing */
  debugInfo: {
    /** Time remaining until session expires (milliseconds) */
    timeRemaining: number;
    /** Human-readable time remaining */
    timeRemainingFormatted: string;
  } | null;
}

export interface SessionDebugInfo {
  /** Whether a session exists */
  hasSession: boolean;
  /** Whether the session is expired */
  isExpired?: boolean;
  /** Time remaining until expiration (milliseconds) */
  timeRemaining?: number;
  /** Human-readable time remaining */
  timeRemainingFormatted?: string;
  /** Session creation timestamp */
  createdAt?: string;
  /** Session expiration timestamp */
  expiresAt?: string;
  /** Token type */
  tokenType?: string;
  /** Granted scopes */
  scope?: string;
  /** Whether refresh token is available */
  hasRefreshToken?: boolean;
  /** Whether ID token is available */
  hasIdToken?: boolean;
  /** User ID */
  userId?: string;
  /** User email */
  userEmail?: string;
}

export interface UserProfile {
  /** User identifier */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User's profile picture URL */
  picture?: string;
  /** User's username */
  username?: string;
  /** Whether email is verified */
  verified?: boolean;
  /** Original user object */
  raw: UserInfo;
}

export interface PKCEParams {
  /** PKCE code verifier */
  codeVerifier: string;
  /** PKCE code challenge */
  codeChallenge: string;
  /** OAuth2 state parameter */
  state: string;
}

export interface OIDCCacheEntry {
  /** Cached OIDC configuration */
  config: OIDCConfiguration;
  /** Cache timestamp */
  timestamp: number;
}

export interface CacheInfo {
  /** Authority URL */
  authority: string;
  /** Cache age in minutes */
  age: number;
  /** Whether cache is expired */
  expired: boolean;
  /** Issuer from cached config */
  issuer?: string;
  /** Error message if cache is corrupted */
  error?: string;
}

// Utility types
export type AuthError = string | Error;
export type AuthCallback = (result: { user: UserInfo; session: AuthSession }) => void;
export type AuthenticatedFetchFunction = (url: string, options?: RequestInit) => Promise<Response>;

// Environment variable types
export interface AuthEnvironmentConfig {
  VITE_OAUTH_AUTHORITY?: string;
  VITE_OAUTH_CLIENT_ID?: string;
  VITE_OAUTH_SCOPE?: string;
  VITE_REDIRECT_URI?: string;
  OAUTH_AUTHORITY?: string;
  OAUTH_CLIENT_ID?: string;
  OAUTH_SCOPE?: string;
}