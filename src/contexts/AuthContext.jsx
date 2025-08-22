/**
 * React Authentication Context
 * Provides authentication state and methods to React components
 * Wraps the OAuth2Service for seamless React integration
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { oauth2Service } from '../services/oauth2Service.js';

// Create the authentication context
const AuthContext = createContext(null);

/**
 * Authentication state object
 * @typedef {Object} AuthState
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {Object|null} user - Current user information
 * @property {boolean} isLoading - Whether auth operation is in progress
 * @property {string|null} error - Current error message
 * @property {boolean} isInitialized - Whether auth service is initialized
 */

/**
 * Authentication Context Provider
 * Manages authentication state and provides auth methods to child components
 */
export function AuthProvider({ children }) {
    // Authentication state
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null,
        isInitialized: false
    });

    /**
     * Updates the authentication state
     * @param {Partial<AuthState>} updates - State updates to apply
     */
    const updateAuthState = useCallback((updates) => {
        setAuthState(prevState => ({
            ...prevState,
            ...updates
        }));
    }, []);

    /**
     * Sets error state and logs it
     * @param {string|Error} error - Error message or error object
     */
    const setError = useCallback((error) => {
        const errorMessage = error instanceof Error ? error.message : error;
        console.error('Auth error:', errorMessage);
        updateAuthState({ 
            error: errorMessage, 
            isLoading: false 
        });
    }, [updateAuthState]);

    /**
     * Clears error state
     */
    const clearError = useCallback(() => {
        updateAuthState({ error: null });
    }, [updateAuthState]);

    /**
     * Initializes the OAuth2 service with environment configuration
     */
    const initializeAuth = useCallback(async () => {
        try {
            updateAuthState({ isLoading: true, error: null });

            // Get configuration from environment variables
            // Supports both VITE_ prefixed (for local development) and build-time injected variables
            const config = {
                authority: import.meta.env.VITE_OAUTH_AUTHORITY || import.meta.env.OAUTH_AUTHORITY,
                clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || import.meta.env.OAUTH_CLIENT_ID,
                scope: import.meta.env.VITE_OAUTH_SCOPE || import.meta.env.OAUTH_SCOPE,
                redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin
            };

            // Validate required configuration
            if (!config.authority || !config.clientId || !config.scope) {
                throw new Error('Missing required OAuth configuration. Please set VITE_OAUTH_AUTHORITY, VITE_OAUTH_CLIENT_ID, and VITE_OAUTH_SCOPE environment variables.');
            }

            console.log('Initializing auth with config:', {
                authority: config.authority,
                clientId: config.clientId,
                scope: config.scope,
                redirectUri: config.redirectUri
            });

            // Initialize OAuth2 service
            await oauth2Service.initialize(config);

            updateAuthState({ 
                isInitialized: true,
                isLoading: false 
            });

            console.log('Auth service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize auth service:', error);
            setError(error);
        }
    }, [updateAuthState, setError]);

    /**
     * Checks current authentication status and updates state
     */
    const checkAuthStatus = useCallback(() => {
        try {
            const isAuthenticated = oauth2Service.isAuthenticated();
            const user = oauth2Service.getCurrentUser();

            updateAuthState({
                isAuthenticated,
                user,
                isLoading: false
            });

            console.log('Auth status checked:', { isAuthenticated, user: user?.email || user?.sub });
        } catch (error) {
            console.error('Failed to check auth status:', error);
            updateAuthState({
                isAuthenticated: false,
                user: null,
                isLoading: false
            });
        }
    }, [updateAuthState]);

    /**
     * Handles OAuth callback on page load
     */
    const handlePageLoad = useCallback(async () => {
        try {
            console.log('Handling page load for potential OAuth callback...');
            
            const result = await oauth2Service.handlePageLoad();
            
            if (result) {
                // OAuth callback was processed successfully
                console.log('OAuth callback processed, user authenticated');
                updateAuthState({
                    isAuthenticated: true,
                    user: result.user,
                    isLoading: false,
                    error: null
                });
            } else {
                // No callback, check existing authentication status
                checkAuthStatus();
            }
        } catch (error) {
            console.error('Failed to handle page load:', error);
            setError(error);
        }
    }, [updateAuthState, checkAuthStatus, setError]);

    /**
     * Starts the OAuth login flow
     */
    const login = useCallback(async () => {
        try {
            clearError();
            updateAuthState({ isLoading: true });
            
            console.log('Starting login flow...');
            await oauth2Service.login();
            
            // Note: This won't execute as login() redirects the page
        } catch (error) {
            console.error('Login failed:', error);
            setError(error);
        }
    }, [clearError, updateAuthState, setError]);

    /**
     * Logs out the current user
     * @param {boolean} redirectToProvider - Whether to redirect to provider logout
     */
    const logout = useCallback(async (redirectToProvider = false) => {
        try {
            clearError();
            updateAuthState({ isLoading: true });
            
            console.log('Logging out...');
            await oauth2Service.logout(redirectToProvider);
            
            // Update state (though page will likely reload)
            updateAuthState({
                isAuthenticated: false,
                user: null,
                isLoading: false
            });
        } catch (error) {
            console.error('Logout failed:', error);
            setError(error);
        }
    }, [clearError, updateAuthState, setError]);

    /**
     * Gets the current access token
     * @returns {string|null} Access token or null if not authenticated
     */
    const getAccessToken = useCallback(() => {
        return oauth2Service.getAccessToken();
    }, []);

    /**
     * Gets debug information about the current session
     * @returns {Object} Debug information
     */
    const getDebugInfo = useCallback(() => {
        return oauth2Service.getAuthStatus();
    }, []);

    /**
     * Refreshes the authentication state
     */
    const refresh = useCallback(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    // Initialize auth service on mount
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                await initializeAuth();
                
                if (mounted) {
                    await handlePageLoad();
                }
            } catch (error) {
                if (mounted) {
                    setError(error);
                }
            }
        };

        initialize();

        return () => {
            mounted = false;
        };
    }, [initializeAuth, handlePageLoad, setError]);

    // Create context value
    const contextValue = {
        // Auth state
        ...authState,
        
        // Auth methods
        login,
        logout,
        refresh,
        clearError,
        
        // Utility methods
        getAccessToken,
        getDebugInfo
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 * @returns {Object} Authentication context value
 */
export function useAuthContext() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    
    return context;
}

/**
 * HOC to provide authentication context to components
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with auth context
 */
export function withAuth(Component) {
    return function WrappedComponent(props) {
        return (
            <AuthProvider>
                <Component {...props} />
            </AuthProvider>
        );
    };
}

export default AuthContext;