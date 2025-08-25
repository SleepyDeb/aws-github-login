/**
 * Session Manager for OAuth2 authentication
 * Handles secure storage and retrieval of authentication data in localStorage
 * Manages tokens, user information, and PKCE verification codes
 */

import type { AuthSession, UserInfo, SessionDebugInfo } from '../types/auth.js';

const SESSION_KEY = 'auth-session';
const PKCE_VERIFIER_KEY = 'pkce-verifier';
const STATE_KEY = 'oauth-state';

/**
 * Stores the authentication session in localStorage
 * @param session - The authentication session to store
 */
export function storeSession(session: AuthSession): void {
    try {
        if (!session || !session.accessToken) {
            throw new Error('Invalid session: access token is required');
        }

        const sessionData: AuthSession = {
            ...session,
            createdAt: session.createdAt || Date.now()
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        console.log('Authentication session stored successfully');
    } catch (error) {
        console.error('Failed to store authentication session:', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Session storage failed: ${message}`);
    }
}

/**
 * Retrieves the authentication session from localStorage
 * @returns The stored session or null if not found/invalid
 */
export function getSession(): AuthSession | null {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) {
            return null;
        }

        const session = JSON.parse(sessionData) as AuthSession;
        
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
 * @returns True if session is valid and not expired
 */
export function isSessionValid(): boolean {
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
 * @returns Milliseconds until expiration, or 0 if expired/invalid
 */
export function getSessionTimeRemaining(): number {
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
export function clearSession(): void {
    try {
        localStorage.removeItem(SESSION_KEY);
        console.log('Authentication session cleared');
    } catch (error) {
        console.error('Failed to clear session:', error);
    }
}

/**
 * Updates the user information in the current session
 * @param userInfo - Updated user information
 */
export function updateSessionUser(userInfo: UserInfo): void {
    const session = getSession();
    if (!session) {
        throw new Error('No active session to update');
    }

    session.user = userInfo;
    storeSession(session);
}

/**
 * Stores the PKCE code verifier for the current OAuth flow
 * @param verifier - The PKCE code verifier
 */
export function storePKCEVerifier(verifier: string): void {
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
 * @returns The stored verifier or null if not found
 */
export function retrievePKCEVerifier(): string | null {
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
 * @param state - The OAuth state parameter
 */
export function storeOAuthState(state: string): void {
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
 * @returns The stored state or null if not found
 */
export function retrieveOAuthState(): string | null {
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
export function clearAllAuthData(): void {
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
 * @returns Debug information object
 */
export function getSessionDebugInfo(): SessionDebugInfo {
    const session = getSession();
    if (!session) {
        return { hasSession: false };
    }

    const now = Date.now();
    const timeRemaining = getSessionTimeRemaining();
    const isExpired = timeRemaining === 0;

    const debugInfo: SessionDebugInfo = {
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
        userId: session.user.sub
    };

    if (session.user.email) {
        debugInfo.userEmail = session.user.email;
    }

    return debugInfo;
}

/**
 * Formats milliseconds into a human-readable time string
 * @param ms - Milliseconds
 * @returns Formatted time string
 */
function formatTime(ms: number): string {
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