/**
 * Authentication Hooks
 * Provides easy-to-use hooks for accessing authentication functionality
 * Wraps the AuthContext for better developer experience
 */

import { useAuthContext } from '../contexts/AuthContext.js';
import type { 
    UserInfo, 
    UserProfile, 
    AuthenticatedFetchFunction,
    AuthDebugInfo 
} from '../types/auth.js';

/**
 * Main authentication hook
 * Provides access to authentication state and methods
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
        getIdToken: auth.getIdToken,
        getDebugInfo: auth.getDebugInfo
    };
}

/**
 * Hook for accessing current user information
 * @returns Current user object or null if not authenticated
 */
export function useUser(): UserInfo | null {
    const { user, isAuthenticated } = useAuthContext();
    return isAuthenticated ? user : null;
}

/**
 * Hook for checking authentication status
 * @returns True if user is authenticated
 */
export function useIsAuthenticated(): boolean {
    const { isAuthenticated } = useAuthContext();
    return isAuthenticated;
}

/**
 * Hook for accessing loading state
 * @returns True if authentication operation is in progress
 */
export function useAuthLoading(): boolean {
    const { isLoading } = useAuthContext();
    return isLoading;
}

/**
 * Hook for accessing authentication errors
 * @returns Error state and clearError function
 */
export function useAuthError(): { error: string | null; clearError: () => void } {
    const { error, clearError } = useAuthContext();
    return { error, clearError };
}

/**
 * Hook for getting the current access token
 * Useful for making authenticated API requests
 * @returns Access token or null if not authenticated
 */
export function useAccessToken(): string | null {
    const { getAccessToken, isAuthenticated } = useAuthContext();
    return isAuthenticated ? getAccessToken() : null;
}

/**
 * Hook for getting the current ID token (JWT)
 * Useful for AWS STS AssumeRoleWithWebIdentity and other JWT-based operations
 * @returns ID token or null if not authenticated
 */
export function useIdToken(): string | null {
    const { getIdToken, isAuthenticated } = useAuthContext();
    return isAuthenticated ? getIdToken() : null;
}

/**
 * Hook that provides authentication methods only
 * Useful when you only need login/logout functionality
 * @returns Authentication methods
 */
export function useAuthActions(): { 
    login: () => Promise<void>; 
    logout: (redirectToProvider?: boolean) => Promise<void>; 
    refresh: () => void; 
} {
    const { login, logout, refresh } = useAuthContext();
    return { login, logout, refresh };
}

/**
 * Hook for getting authentication debug information
 * Useful for development and debugging
 * @returns Debug information about current auth state
 */
export function useAuthDebug(): AuthDebugInfo {
    const { getDebugInfo } = useAuthContext();
    return getDebugInfo();
}

/**
 * Hook that returns a function to make authenticated API requests
 * Automatically includes the Authorization header with the access token
 * @returns Function to make authenticated requests
 */
export function useAuthenticatedFetch(): AuthenticatedFetchFunction {
    const { getAccessToken, isAuthenticated } = useAuthContext();
    
    return async (url: string, options: RequestInit = {}): Promise<Response> => {
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
 * @returns Render helper functions
 */
export function useAuthRender(): {
    whenAuthenticated: (component: React.ReactNode) => React.ReactNode | null;
    whenUnauthenticated: (component: React.ReactNode) => React.ReactNode | null;
    whenLoading: (component: React.ReactNode) => React.ReactNode | null;
} {
    const { isAuthenticated, isLoading } = useAuthContext();
    
    return {
        /**
         * Renders content only when user is authenticated
         * @param component - Component to render
         * @returns Component or null
         */
        whenAuthenticated: (component: React.ReactNode): React.ReactNode | null => 
            isAuthenticated ? component : null,
        
        /**
         * Renders content only when user is not authenticated
         * @param component - Component to render
         * @returns Component or null
         */
        whenUnauthenticated: (component: React.ReactNode): React.ReactNode | null => 
            !isAuthenticated && !isLoading ? component : null,
        
        /**
         * Renders content only when loading
         * @param component - Component to render
         * @returns Component or null
         */
        whenLoading: (component: React.ReactNode): React.ReactNode | null => 
            isLoading ? component : null
    };
}

/**
 * Hook that provides user profile information with fallbacks
 * @returns User profile with common fields
 */
export function useUserProfile(): UserProfile | null {
    const user = useUser();
    
    if (!user) {
        return null;
    }
    
    const profile: UserProfile = {
        id: user.sub,
        name: user.name || user.given_name || user.preferred_username || 'User',
        raw: user // Original user object
    };

    // Add optional properties only if they exist
    if (user.email) {
        profile.email = user.email;
    }
    if (user.given_name) {
        profile.firstName = user.given_name;
    }
    if (user.family_name) {
        profile.lastName = user.family_name;
    }
    const pictureValue = user.picture || user.avatar_url;
    if (pictureValue) {
        profile.picture = pictureValue;
    }
    const usernameValue = user.preferred_username || user.login;
    if (usernameValue) {
        profile.username = usernameValue;
    }
    if (user.email_verified !== undefined) {
        profile.verified = user.email_verified;
    }

    return profile;
}

/**
 * Hook for session management
 * @returns Session information and management functions
 */
export function useSession(): {
    isActive: boolean;
    user: UserInfo | null;
    expiresAt?: number;
    timeRemaining?: number;
    timeRemainingFormatted?: string;
    refresh: () => void;
    logout: (redirectToProvider?: boolean) => Promise<void>;
} {
    const { isAuthenticated, user, getDebugInfo, refresh, logout } = useAuthContext();
    
    const debugInfo = getDebugInfo();
    
    const sessionInfo: {
        isActive: boolean;
        user: UserInfo | null;
        expiresAt?: number;
        timeRemaining?: number;
        timeRemainingFormatted?: string;
        refresh: () => void;
        logout: (redirectToProvider?: boolean) => Promise<void>;
    } = {
        isActive: isAuthenticated,
        user,
        refresh,
        logout
    };

    // Add optional properties only if they exist
    if (debugInfo.session?.expiresAt) {
        sessionInfo.expiresAt = debugInfo.session.expiresAt;
    }
    if (debugInfo.debugInfo?.timeRemaining) {
        sessionInfo.timeRemaining = debugInfo.debugInfo.timeRemaining;
    }
    if (debugInfo.debugInfo?.timeRemainingFormatted) {
        sessionInfo.timeRemainingFormatted = debugInfo.debugInfo.timeRemainingFormatted;
    }

    return sessionInfo;
}

/**
 * Custom hook for handling authentication errors with automatic retry
 * @param maxRetries - Maximum number of retry attempts
 * @returns Error handling utilities
 */
export function useAuthErrorHandler(maxRetries: number = 3): {
    error: string | null;
    hasError: boolean;
    clearError: () => void;
    retryAuth: () => Promise<void>;
} {
    const { error, clearError, refresh } = useAuthContext();
    
    const retryAuth = async (): Promise<void> => {
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                clearError();
                await refresh();
                break;
            } catch (err) {
                attempts++;
                if (attempts >= maxRetries) {
                    const message = err instanceof Error ? err.message : String(err);
                    throw new Error(`Authentication failed after ${maxRetries} attempts: ${message}`);
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