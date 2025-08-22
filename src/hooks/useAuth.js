/**
 * Authentication Hooks
 * Provides easy-to-use hooks for accessing authentication functionality
 * Wraps the AuthContext for better developer experience
 */

import { useAuthContext } from '../contexts/AuthContext.jsx';

/**
 * Main authentication hook
 * Provides access to authentication state and methods
 * @returns {Object} Authentication state and methods
 */
export function useAuth() {
    const auth = useAuthContext();
    
    return {
        // Authentication state
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        isInitialized: auth.isInitialized,
        user: auth.user,
        error: auth.error,
        
        // Authentication methods
        login: auth.login,
        logout: auth.logout,
        refresh: auth.refresh,
        clearError: auth.clearError,
        
        // Utility methods
        getAccessToken: auth.getAccessToken,
        getDebugInfo: auth.getDebugInfo
    };
}

/**
 * Hook for accessing current user information
 * @returns {Object|null} Current user object or null if not authenticated
 */
export function useUser() {
    const { user, isAuthenticated } = useAuthContext();
    return isAuthenticated ? user : null;
}

/**
 * Hook for checking authentication status
 * @returns {boolean} True if user is authenticated
 */
export function useIsAuthenticated() {
    const { isAuthenticated } = useAuthContext();
    return isAuthenticated;
}

/**
 * Hook for accessing loading state
 * @returns {boolean} True if authentication operation is in progress
 */
export function useAuthLoading() {
    const { isLoading } = useAuthContext();
    return isLoading;
}

/**
 * Hook for accessing authentication errors
 * @returns {Object} Error state and clearError function
 */
export function useAuthError() {
    const { error, clearError } = useAuthContext();
    return { error, clearError };
}

/**
 * Hook for getting the current access token
 * Useful for making authenticated API requests
 * @returns {string|null} Access token or null if not authenticated
 */
export function useAccessToken() {
    const { getAccessToken, isAuthenticated } = useAuthContext();
    return isAuthenticated ? getAccessToken() : null;
}

/**
 * Hook that provides authentication methods only
 * Useful when you only need login/logout functionality
 * @returns {Object} Authentication methods
 */
export function useAuthActions() {
    const { login, logout, refresh } = useAuthContext();
    return { login, logout, refresh };
}

/**
 * Hook for getting authentication debug information
 * Useful for development and debugging
 * @returns {Object} Debug information about current auth state
 */
export function useAuthDebug() {
    const { getDebugInfo } = useAuthContext();
    return getDebugInfo();
}

/**
 * Hook that returns a function to make authenticated API requests
 * Automatically includes the Authorization header with the access token
 * @returns {Function} Function to make authenticated requests
 */
export function useAuthenticatedFetch() {
    const { getAccessToken, isAuthenticated } = useAuthContext();
    
    return async (url, options = {}) => {
        if (!isAuthenticated) {
            throw new Error('User is not authenticated');
        }
        
        const token = getAccessToken();
        if (!token) {
            throw new Error('No access token available');
        }
        
        const authHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        return fetch(url, {
            ...options,
            headers: authHeaders
        });
    };
}

/**
 * Hook for conditional rendering based on authentication status
 * @returns {Object} Render helper functions
 */
export function useAuthRender() {
    const { isAuthenticated, isLoading } = useAuthContext();
    
    return {
        /**
         * Renders content only when user is authenticated
         * @param {Function|React.Component} component - Component to render
         * @returns {React.Component|null} Component or null
         */
        whenAuthenticated: (component) => isAuthenticated ? component : null,
        
        /**
         * Renders content only when user is not authenticated
         * @param {Function|React.Component} component - Component to render
         * @returns {React.Component|null} Component or null
         */
        whenUnauthenticated: (component) => !isAuthenticated && !isLoading ? component : null,
        
        /**
         * Renders content only when loading
         * @param {Function|React.Component} component - Component to render
         * @returns {React.Component|null} Component or null
         */
        whenLoading: (component) => isLoading ? component : null
    };
}

/**
 * Hook that provides user profile information with fallbacks
 * @returns {Object} User profile with common fields
 */
export function useUserProfile() {
    const user = useUser();
    
    if (!user) {
        return null;
    }
    
    return {
        id: user.sub || user.id,
        email: user.email,
        name: user.name || user.given_name || user.nickname || 'User',
        firstName: user.given_name || user.first_name,
        lastName: user.family_name || user.last_name,
        picture: user.picture || user.avatar_url,
        username: user.preferred_username || user.username || user.login,
        verified: user.email_verified,
        raw: user // Original user object
    };
}

/**
 * Hook for session management
 * @returns {Object} Session information and management functions
 */
export function useSession() {
    const { isAuthenticated, user, getDebugInfo, refresh, logout } = useAuthContext();
    
    const debugInfo = getDebugInfo();
    
    return {
        isActive: isAuthenticated,
        user,
        expiresAt: debugInfo.session?.expiresAt,
        timeRemaining: debugInfo.debugInfo?.timeRemaining,
        timeRemainingFormatted: debugInfo.debugInfo?.timeRemainingFormatted,
        refresh,
        logout
    };
}

/**
 * Custom hook for handling authentication errors with automatic retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Object} Error handling utilities
 */
export function useAuthErrorHandler(maxRetries = 3) {
    const { error, clearError, refresh } = useAuthContext();
    
    const retryAuth = async () => {
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                clearError();
                await refresh();
                break;
            } catch (err) {
                attempts++;
                if (attempts >= maxRetries) {
                    throw new Error(`Authentication failed after ${maxRetries} attempts: ${err.message}`);
                }
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
            }
        }
    };
    
    return {
        error,
        hasError: !!error,
        clearError,
        retryAuth
    };
}

// Default export for convenience
export default useAuth;