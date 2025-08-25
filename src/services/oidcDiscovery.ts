/**
 * OpenID Connect Discovery Service
 * Implements automatic discovery of OAuth2/OIDC endpoints as per RFC 8414
 * Provides caching mechanism using localStorage for performance
 */

import type { OIDCConfiguration, OIDCEndpoints, OIDCCacheEntry, CacheInfo } from '../types/auth.js';

const CACHE_KEY = 'oidc-manifest';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches the OpenID Connect configuration from the well-known endpoint
 * @param authority - The OAuth2 authority URL
 * @returns The OIDC configuration object
 * @throws If the discovery fails or configuration is invalid
 */
async function fetchOIDCConfiguration(authority: string): Promise<OIDCConfiguration> {
    if (!authority) {
        throw new Error('OAuth authority is required for OIDC discovery');
    }

    // Ensure authority doesn't end with a slash
    const cleanAuthority = authority.replace(/\/$/, '');
    const discoveryUrl = `${cleanAuthority}/.well-known/openid-configuration`;

    try {
        console.log(`Fetching OIDC configuration from: ${discoveryUrl}`);
        
        const response = await fetch(discoveryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch OIDC configuration: ${response.status} ${response.statusText}`);
        }

        const config = await response.json() as OIDCConfiguration;
        
        // Validate required endpoints exist
        validateOIDCConfiguration(config);
        
        return config;
    } catch (error) {
        console.error('OIDC Discovery failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`OIDC discovery failed: ${message}`);
    }
}

/**
 * Validates that the OIDC configuration contains required endpoints
 * @param config - The OIDC configuration object
 * @throws If required endpoints are missing
 */
function validateOIDCConfiguration(config: OIDCConfiguration): void {
    const requiredEndpoints: (keyof OIDCConfiguration)[] = [
        'authorization_endpoint',
        'token_endpoint'
    ];

    const missingEndpoints = requiredEndpoints.filter(endpoint => !config[endpoint]);
    
    if (missingEndpoints.length > 0) {
        throw new Error(`OIDC configuration missing required endpoints: ${missingEndpoints.join(', ')}`);
    }

    // Log available endpoints for debugging
    console.log('OIDC Configuration loaded with endpoints:', {
        authorization_endpoint: config.authorization_endpoint,
        token_endpoint: config.token_endpoint,
        userinfo_endpoint: config.userinfo_endpoint,
        issuer: config.issuer
    });
}

/**
 * Gets cached OIDC configuration from localStorage
 * @param authority - The OAuth2 authority URL
 * @returns Cached configuration or null if not found/expired
 */
function getCachedConfiguration(authority: string): OIDCConfiguration | null {
    try {
        const cached = localStorage.getItem(`${CACHE_KEY}-${btoa(authority)}`);
        if (!cached) {
            return null;
        }

        const { config, timestamp }: OIDCCacheEntry = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp > CACHE_DURATION) {
            console.log('OIDC configuration cache expired, will refetch');
            localStorage.removeItem(`${CACHE_KEY}-${btoa(authority)}`);
            return null;
        }

        console.log('Using cached OIDC configuration');
        return config;
    } catch (error) {
        console.warn('Failed to read cached OIDC configuration:', error);
        return null;
    }
}

/**
 * Caches OIDC configuration in localStorage
 * @param authority - The OAuth2 authority URL
 * @param config - The OIDC configuration to cache
 */
function setCachedConfiguration(authority: string, config: OIDCConfiguration): void {
    try {
        const cacheData: OIDCCacheEntry = {
            config,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`${CACHE_KEY}-${btoa(authority)}`, JSON.stringify(cacheData));
        console.log('OIDC configuration cached successfully');
    } catch (error) {
        console.warn('Failed to cache OIDC configuration:', error);
        // Non-fatal error, continue without caching
    }
}

/**
 * Discovers OAuth2/OIDC endpoints for the given authority
 * Uses caching to improve performance and reduce network requests
 * @param authority - The OAuth2 authority URL
 * @returns Object containing discovered endpoints
 */
export async function discoverOIDCEndpoints(authority: string): Promise<OIDCEndpoints> {
    if (!authority) {
        throw new Error('OAuth authority is required');
    }

    // Try to get cached configuration first
    let config = getCachedConfiguration(authority);

    if (!config) {
        // Fetch fresh configuration if not cached or expired
        config = await fetchOIDCConfiguration(authority);
        setCachedConfiguration(authority, config);
    }

    // Extract and return the endpoints we need
    const endpoints: OIDCEndpoints = {
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        supportedScopes: config.scopes_supported || [],
        supportedResponseTypes: config.response_types_supported || [],
        supportedCodeChallengeMethods: config.code_challenge_methods_supported || []
    };

    // Add optional properties only if they exist
    if (config.userinfo_endpoint) {
        endpoints.userinfoEndpoint = config.userinfo_endpoint;
    }
    if (config.issuer) {
        endpoints.issuer = config.issuer;
    }
    if (config.end_session_endpoint) {
        endpoints.endSessionEndpoint = config.end_session_endpoint;
    }

    return endpoints;
}

/**
 * Clears all cached OIDC configurations
 * Useful for debugging or when switching between different authorities
 */
export function clearOIDCCache(): void {
    try {
        const keys = Object.keys(localStorage);
        const oidcKeys = keys.filter(key => key.startsWith(CACHE_KEY));
        
        oidcKeys.forEach(key => localStorage.removeItem(key));
        console.log(`Cleared ${oidcKeys.length} cached OIDC configurations`);
    } catch (error) {
        console.warn('Failed to clear OIDC cache:', error);
    }
}

/**
 * Gets information about cached configurations (for debugging)
 * @returns Array of cached configuration info
 */
export function getCacheInfo(): CacheInfo[] {
    try {
        const keys = Object.keys(localStorage);
        const oidcKeys = keys.filter(key => key.startsWith(CACHE_KEY));
        
        return oidcKeys.map(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '{}') as OIDCCacheEntry;
                const authority = atob(key.replace(`${CACHE_KEY}-`, ''));
                const age = Date.now() - data.timestamp;
                const expired = age > CACHE_DURATION;
                
                return {
                    authority,
                    age: Math.round(age / 1000 / 60), // age in minutes
                    expired,
                    issuer: data.config?.issuer
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { 
                    authority: key, 
                    age: 0, 
                    expired: true,
                    error: message 
                };
            }
        });
    } catch (error) {
        console.warn('Failed to get cache info:', error);
        return [];
    }
}