/**
 * Session Manager for OAuth2 authentication
 * Handles secure storage and retrieval of authentication data in localStorage
 * Manages tokens, user information, and PKCE verification codes
 */

const SESSION_KEY = 'auth-session';
const PKCE_VERIFIER_KEY = 'pkce-verifier';
const STATE_KEY = 'oauth-state';

/**
 * Represents an authentication session
 * @typedef {Object} AuthSession
 * @property {string} accessToken - The OAuth2 access token
 * @property {string} [refreshToken] - The OAuth2 refresh token (if available)
 * @property {string} [idToken] - The OpenID Connect ID token (if available)
 * @property {number} expiresAt - Timestamp when the access token expires
 * @property {Object} user - User information from userinfo endpoint
 * @property {string} tokenType - Token type (usually 'Bearer')
 * @property {string} scope - Granted scopes
 * @property {number} createdAt - Timestamp when session was created
 */

/**
 * Stores the authentication session in localStorage
 * @param {AuthSession} session - The authentication session to store
 */
export function storeSession(session) {
    try {
        if (!session || !session.accessToken) {
            throw new Error('Invalid session: access token is required');
        }

        const sessionData = {
            ...session,
            createdAt: session.createdAt || Date.now()
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        console.log('Authentication session stored successfully');
    } catch (error) {
        console.error('Failed to store authentication session:', error);
        throw new Error(`Session storage failed: ${error.message}`);
    }
}

/**
 * Retrieves the authentication session from localStorage
 * @returns {AuthSession|null} The stored session or null if not found/invalid
 */
export function getSession() {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) {
            return null;
        }

        const session = JSON.parse(sessionData);
        
        // Validate session structure
        if (!session.accessToken || !session.expiresAt) {
            console.warn('Invalid session structure found, clearing session');
            clearSession();
            return null;
        }

        return session;
    } catch (error) {
        console.error('Failed to retrieve session:', error);
        clearSession(); // Clear corrupted session
        return null;
    }
}

/**
 * Checks if the current session is valid and not expired
 * @returns {boolean} True if session is valid and not expired
 */
export function isSessionValid() {
    const session = getSession();
    if (!session) {
        return false;
    }

    const now = Date.now();
    const isExpired = now >= session.expiresAt;
    
    if (isExpired) {
        console.log('Session has expired');
        clearSession();
        return false;
    }

    return true;
}

/**
 * Gets the time remaining until session expires
 * @returns {number} Milliseconds until expiration, or 0 if expired/invalid
 */
export function getSessionTimeRemaining() {
    const session = getSession();
    if (!session) {
        return 0;
    }

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, remaining);
}

/**
 * Clears the authentication session from localStorage
 */
export function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
        console.log('Authentication session cleared');
    } catch (error) {
        console.error('Failed to clear session:', error);
    }
}

/**
 * Updates the user information in the current session
 * @param {Object} userInfo - Updated user information
 */
export function updateSessionUser(userInfo) {
    const session = getSession();
    if (!session) {
        throw new Error('No active session to update');
    }

    session.user = userInfo;
    storeSession(session);
}

/**
 * Stores the PKCE code verifier for the current OAuth flow
 * @param {string} verifier - The PKCE code verifier
 */
export function storePKCEVerifier(verifier) {
    try {
        if (!verifier) {
            throw new Error('PKCE verifier is required');
        }

        localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
        console.log('PKCE verifier stored');
    } catch (error) {
        console.error('Failed to store PKCE verifier:', error);
        throw error;
    }
}

/**
 * Retrieves and removes the PKCE code verifier
 * @returns {string|null} The stored verifier or null if not found
 */
export function retrievePKCEVerifier() {
    try {
        const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
        if (verifier) {
            localStorage.removeItem(PKCE_VERIFIER_KEY);
            console.log('PKCE verifier retrieved and removed');
        }
        return verifier;
    } catch (error) {
        console.error('Failed to retrieve PKCE verifier:', error);
        return null;
    }
}

/**
 * Stores the OAuth state parameter for CSRF protection
 * @param {string} state - The OAuth state parameter
 */
export function storeOAuthState(state) {
    try {
        if (!state) {
            throw new Error('OAuth state is required');
        }

        localStorage.setItem(STATE_KEY, state);
        console.log('OAuth state stored');
    } catch (error) {
        console.error('Failed to store OAuth state:', error);
        throw error;
    }
}

/**
 * Retrieves and removes the OAuth state parameter
 * @returns {string|null} The stored state or null if not found
 */
export function retrieveOAuthState() {
    try {
        const state = localStorage.getItem(STATE_KEY);
        if (state) {
            localStorage.removeItem(STATE_KEY);
            console.log('OAuth state retrieved and removed');
        }
        return state;
    } catch (error) {
        console.error('Failed to retrieve OAuth state:', error);
        return null;
    }
}

/**
 * Clears all authentication-related data from localStorage
 * Use this for complete logout or when switching between different OAuth providers
 */
export function clearAllAuthData() {
    try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PKCE_VERIFIER_KEY);
        localStorage.removeItem(STATE_KEY);
        
        // Also clear any OIDC cache that might be related to current session
        const keys = Object.keys(localStorage);
        const authKeys = keys.filter(key => 
            key.startsWith('oidc-manifest') || 
            key.startsWith('auth-') ||
            key.startsWith('oauth-')
        );
        
        authKeys.forEach(key => localStorage.removeItem(key));
        
        console.log('All authentication data cleared');
    } catch (error) {
        console.error('Failed to clear all auth data:', error);
    }
}

/**
 * Gets debug information about the current session
 * @returns {Object} Debug information object
 */
export function getSessionDebugInfo() {
    const session = getSession();
    if (!session) {
        return { hasSession: false };
    }

    const now = Date.now();
    const timeRemaining = getSessionTimeRemaining();
    const isExpired = timeRemaining === 0;

    return {
        hasSession: true,
        isExpired,
        timeRemaining,
        timeRemainingFormatted: formatTime(timeRemaining),
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        tokenType: session.tokenType,
        scope: session.scope,
        hasRefreshToken: !!session.refreshToken,
        hasIdToken: !!session.idToken,
        userId: session.user?.sub || session.user?.id,
        userEmail: session.user?.email
    };
}

/**
 * Formats milliseconds into a human-readable time string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
    if (ms <= 0) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}