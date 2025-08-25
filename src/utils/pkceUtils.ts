/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth2 authentication
 * Implements RFC 7636 specification for enhanced security
 */

/**
 * Generates a cryptographically secure random string for the code verifier
 * Uses base64url encoding as specified in RFC 7636
 * @returns A code verifier string (43-128 characters)
 */
export function generateCodeVerifier(): string {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    
    return btoa(String.fromCharCode.apply(null, Array.from(randomBytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generates a code challenge from the code verifier using SHA-256
 * Uses base64url encoding as specified in RFC 7636
 * @param verifier - The code verifier string
 * @returns A promise that resolves to the code challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hashBuffer))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Validates that a code verifier meets RFC 7636 requirements
 * @param verifier - The code verifier to validate
 * @returns True if valid, false otherwise
 */
export function isValidCodeVerifier(verifier: string): boolean {
    if (!verifier || typeof verifier !== 'string') {
        return false;
    }
    
    // RFC 7636: code verifier must be 43-128 characters
    if (verifier.length < 43 || verifier.length > 128) {
        return false;
    }
    
    // RFC 7636: must contain only unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
    const validPattern = /^[A-Za-z0-9\-._~]+$/;
    return validPattern.test(verifier);
}

/**
 * Generates a cryptographically secure state parameter for OAuth2 requests
 * Used to prevent CSRF attacks
 * @returns A random state string
 */
export function generateState(): string {
    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    
    return btoa(String.fromCharCode.apply(null, Array.from(randomBytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}