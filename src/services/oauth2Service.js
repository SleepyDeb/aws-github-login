/**
 * OAuth2 Service with PKCE support
 * Orchestrates the complete OAuth2 authentication flow
 * Integrates OIDC discovery, PKCE utilities, and session management
 */

import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils/pkceUtils.js';
import { discoverOIDCEndpoints } from './oidcDiscovery.js';
import { 
    storeSession, 
    getSession, 
    isSessionValid, 
    clearSession,
    storePKCEVerifier,
    retrievePKCEVerifier,
    storeOAuthState,
    retrieveOAuthState,
    clearAllAuthData,
    getSessionDebugInfo
} from './sessionManager.js';

/**
 * OAuth2 Service class for handling authentication flows
 */
export class OAuth2Service {
    constructor() {
        this.authority = null;
        this.clientId = null;
        this.scope = null;
        this.redirectUri = null;
        this.endpoints = null;
        this.initialized = false;
    }

    /**
     * Initializes the OAuth2 service with configuration
     * @param {Object} config - Configuration object
     * @param {string} config.authority - OAuth2 authority URL
     * @param {string} config.clientId - OAuth2 client ID
     * @param {string} config.scope - OAuth2 scopes
     * @param {string} [config.redirectUri] - Redirect URI (defaults to current origin)
     */
    async initialize(config) {
        try {
            // Validate required configuration
            if (!config.authority || !config.clientId || !config.scope) {
                throw new Error('OAuth2 configuration requires authority, clientId, and scope');
            }

            this.authority = config.authority.replace(/\/$/, ''); // Remove trailing slash
            this.clientId = config.clientId;
            this.scope = config.scope;
            this.redirectUri = config.redirectUri || window.location.origin;

            console.log('Initializing OAuth2 service with config:', {
                authority: this.authority,
                clientId: this.clientId,
                scope: this.scope,
                redirectUri: this.redirectUri
            });

            // Discover OIDC endpoints
            this.endpoints = await discoverOIDCEndpoints(this.authority);
            
            console.log('OAuth2 service initialized successfully with endpoints:', this.endpoints);
            this.initialized = true;

            return this.endpoints;
        } catch (error) {
            console.error('Failed to initialize OAuth2 service:', error);
            throw new Error(`OAuth2 initialization failed: ${error.message}`);
        }
    }

    /**
     * Checks if the service is properly initialized
     * @throws {Error} If service is not initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('OAuth2 service not initialized. Call initialize() first.');
        }
    }

    /**
     * Starts the OAuth2 authentication flow
     * Generates PKCE parameters and redirects to authorization endpoint
     */
    async login() {
        this.ensureInitialized();

        try {
            console.log('Starting OAuth2 login flow...');

            // Generate PKCE parameters
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            const state = generateState();

            // Store PKCE verifier and state for later use
            storePKCEVerifier(codeVerifier);
            storeOAuthState(state);

            // Build authorization URL
            const authUrl = new URL(this.endpoints.authorizationEndpoint);
            authUrl.searchParams.append('client_id', this.clientId);
            authUrl.searchParams.append('redirect_uri', this.redirectUri);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('scope', this.scope);
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            authUrl.searchParams.append('state', state);

            console.log('Redirecting to authorization endpoint:', authUrl.toString());

            // Redirect to authorization server
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Failed to start login flow:', error);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Handles the OAuth2 callback after user authorization
     * Exchanges authorization code for tokens
     * @param {string} code - Authorization code from callback
     * @param {string} state - State parameter from callback
     * @returns {Promise<Object>} User information and session data
     */
    async handleCallback(code, state) {
        this.ensureInitialized();

        try {
            console.log('Handling OAuth2 callback...');

            // Validate state parameter to prevent CSRF attacks
            const storedState = retrieveOAuthState();
            if (!storedState || storedState !== state) {
                throw new Error('Invalid state parameter - possible CSRF attack');
            }

            // Retrieve PKCE verifier
            const codeVerifier = retrievePKCEVerifier();
            if (!codeVerifier) {
                throw new Error('PKCE code verifier not found');
            }

            // Exchange authorization code for tokens
            const tokenResponse = await this.exchangeCodeForTokens(code, codeVerifier);
            
            // Fetch user information
            const userInfo = await this.fetchUserInfo(tokenResponse.access_token);

            // Calculate token expiration time
            const expiresIn = tokenResponse.expires_in || 3600; // Default to 1 hour
            const expiresAt = Date.now() + (expiresIn * 1000);

            // Create and store session
            const session = {
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                idToken: tokenResponse.id_token,
                tokenType: tokenResponse.token_type || 'Bearer',
                scope: tokenResponse.scope || this.scope,
                expiresAt,
                user: userInfo
            };

            storeSession(session);

            console.log('OAuth2 callback handled successfully, user authenticated');
            return { user: userInfo, session };
        } catch (error) {
            console.error('Failed to handle OAuth2 callback:', error);
            // Clean up any stored state on error
            retrievePKCEVerifier();
            retrieveOAuthState();
            throw new Error(`Callback handling failed: ${error.message}`);
        }
    }

    /**
     * Exchanges authorization code for access tokens
     * @param {string} code - Authorization code
     * @param {string} codeVerifier - PKCE code verifier
     * @returns {Promise<Object>} Token response object
     */
    async exchangeCodeForTokens(code, codeVerifier) {
        try {
            console.log('Exchanging authorization code for tokens...');

            const params = new URLSearchParams();
            params.append('client_id', this.clientId);
            params.append('code', code);
            params.append('code_verifier', codeVerifier);
            params.append('redirect_uri', this.redirectUri);
            params.append('grant_type', 'authorization_code');

            const response = await fetch(this.endpoints.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const tokenData = await response.json();

            if (tokenData.error) {
                throw new Error(`Token error: ${tokenData.error_description || tokenData.error}`);
            }

            if (!tokenData.access_token) {
                throw new Error('No access token received');
            }

            console.log('Token exchange successful');
            return tokenData;
        } catch (error) {
            console.error('Token exchange failed:', error);
            throw error;
        }
    }

    /**
     * Fetches user information from the userinfo endpoint
     * @param {string} accessToken - Access token
     * @returns {Promise<Object>} User information object
     */
    async fetchUserInfo(accessToken) {
        try {
            console.log('Fetching user information...');

            if (!this.endpoints.userinfoEndpoint) {
                console.warn('No userinfo endpoint available, returning minimal user data');
                return { sub: 'unknown', authenticated: true };
            }

            const response = await fetch(this.endpoints.userinfoEndpoint, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Userinfo fetch failed: ${response.status} ${response.statusText}`);
            }

            const userInfo = await response.json();
            console.log('User information fetched successfully');
            return userInfo;
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            // Return minimal user data if userinfo fetch fails
            return { sub: 'unknown', authenticated: true, error: error.message };
        }
    }

    /**
     * Logs out the current user
     * Clears session data and optionally redirects to logout endpoint
     * @param {boolean} [redirectToProvider=false] - Whether to redirect to provider logout
     */
    async logout(redirectToProvider = false) {
        try {
            console.log('Logging out user...');

            const session = getSession();
            clearAllAuthData();

            if (redirectToProvider && this.endpoints && this.endpoints.endSessionEndpoint) {
                // Redirect to provider logout endpoint if available
                const logoutUrl = new URL(this.endpoints.endSessionEndpoint);
                if (session?.idToken) {
                    logoutUrl.searchParams.append('id_token_hint', session.idToken);
                }
                logoutUrl.searchParams.append('post_logout_redirect_uri', this.redirectUri);
                
                window.location.href = logoutUrl.toString();
            } else {
                // Just reload the page to clear app state
                window.location.reload();
            }
        } catch (error) {
            console.error('Logout failed:', error);
            // Force clear all data and reload on error
            clearAllAuthData();
            window.location.reload();
        }
    }

    /**
     * Gets the current authentication status
     * @returns {Object} Authentication status object
     */
    getAuthStatus() {
        return {
            isAuthenticated: isSessionValid(),
            session: getSession(),
            debugInfo: getSessionDebugInfo()
        };
    }

    /**
     * Checks if user is currently authenticated
     * @returns {boolean} True if authenticated and session is valid
     */
    isAuthenticated() {
        return isSessionValid();
    }

    /**
     * Gets the current user information
     * @returns {Object|null} User information or null if not authenticated
     */
    getCurrentUser() {
        const session = getSession();
        return session?.user || null;
    }

    /**
     * Gets the current access token
     * @returns {string|null} Access token or null if not authenticated
     */
    getAccessToken() {
        const session = getSession();
        return session?.accessToken || null;
    }

    /**
     * Handles the page load to check for OAuth callback
     * Should be called on app initialization
     * @returns {Promise<Object|null>} User data if callback was handled, null otherwise
     */
    async handlePageLoad() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');

            // Check for OAuth error response
            if (error) {
                const errorDescription = urlParams.get('error_description') || error;
                throw new Error(`OAuth error: ${errorDescription}`);
            }

            // Check for OAuth callback
            if (code && state) {
                console.log('OAuth callback detected, processing...');
                
                // Clean up URL parameters
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

                // Handle the callback
                const result = await this.handleCallback(code, state);
                return result;
            }

            return null;
        } catch (error) {
            console.error('Failed to handle page load:', error);
            // Clean up URL on error
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            throw error;
        }
    }
}

// Create and export a singleton instance
export const oauth2Service = new OAuth2Service();