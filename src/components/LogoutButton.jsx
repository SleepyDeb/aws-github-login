/**
 * Logout Button Component
 * Provides a button to sign out and clear authentication session
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Logout Button Component
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.text] - Button text (default: "Logout")
 * @param {boolean} [props.disabled] - Whether button is disabled
 * @param {boolean} [props.redirectToProvider] - Whether to redirect to provider logout
 * @param {boolean} [props.confirmLogout] - Whether to show confirmation dialog
 * @param {Function} [props.onClick] - Additional click handler
 * @param {Function} [props.onLogoutComplete] - Callback after successful logout
 * @param {Object} [props.style] - Inline styles
 * @returns {React.Component} Logout button component
 */
export function LogoutButton({ 
    className = '', 
    text = 'Logout', 
    disabled = false,
    redirectToProvider = false,
    confirmLogout = false,
    onClick,
    onLogoutComplete,
    style = {},
    ...props 
}) {
    const { logout, isLoading, isAuthenticated, user } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleClick = async (event) => {
        try {
            // Call additional click handler if provided
            if (onClick) {
                const shouldContinue = await onClick(event);
                if (shouldContinue === false) {
                    return; // Allow onClick to cancel logout
                }
            }

            // Show confirmation dialog if requested
            if (confirmLogout) {
                const userDisplayName = user?.name || user?.email || 'current user';
                const confirmed = window.confirm(
                    `Are you sure you want to log out ${userDisplayName}?`
                );
                if (!confirmed) {
                    return;
                }
            }
            
            setIsLoggingOut(true);
            
            // Perform logout
            await logout(redirectToProvider);
            
            // Call completion callback if provided
            if (onLogoutComplete) {
                onLogoutComplete();
            }
            
        } catch (err) {
            console.error('Logout button click failed:', err);
            setIsLoggingOut(false);
        }
    };

    // Don't show logout button if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    const isDisabled = disabled || isLoading || isLoggingOut;

    const defaultStyle = {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        fontSize: '16px',
        borderRadius: '6px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        opacity: isDisabled ? 0.6 : 1,
        marginLeft: '8px',
        ...style
    };

    const hoverStyle = {
        backgroundColor: '#c82333'
    };

    return (
        <button
            type="button"
            className={`logout-button ${className}`}
            onClick={handleClick}
            disabled={isDisabled}
            style={defaultStyle}
            onMouseEnter={(e) => {
                if (!isDisabled) {
                    e.target.style.backgroundColor = hoverStyle.backgroundColor;
                }
            }}
            onMouseLeave={(e) => {
                if (!isDisabled) {
                    e.target.style.backgroundColor = defaultStyle.backgroundColor;
                }
            }}
            title={`Sign out ${user?.name || user?.email || 'current user'}`}
            {...props}
        >
            {isLoggingOut ? 'Logging out...' : text}
        </button>
    );
}

/**
 * Compact Logout Button Component
 * Smaller version for navigation bars or compact layouts
 */
export function CompactLogoutButton(props) {
    return (
        <LogoutButton
            {...props}
            style={{
                padding: '6px 12px',
                fontSize: '14px',
                ...props.style
            }}
        />
    );
}

/**
 * Icon-only Logout Button Component
 * Shows only an icon for very compact layouts
 */
export function IconLogoutButton(props) {
    return (
        <LogoutButton
            {...props}
            text="🚪"
            style={{
                padding: '8px',
                fontSize: '16px',
                minWidth: '36px',
                ...props.style
            }}
            title="Logout"
        />
    );
}

/**
 * Safe Logout Button Component
 * Always shows confirmation dialog before logout
 */
export function SafeLogoutButton(props) {
    return (
        <LogoutButton
            {...props}
            confirmLogout={true}
            text={props.text || 'Sign Out'}
        />
    );
}

/**
 * Provider Logout Button Component
 * Always redirects to OAuth provider logout endpoint
 */
export function ProviderLogoutButton(props) {
    return (
        <LogoutButton
            {...props}
            redirectToProvider={true}
            text={props.text || 'Sign Out Everywhere'}
            title="Sign out from this app and the OAuth provider"
        />
    );
}

/**
 * Text Logout Link Component
 * Renders as a text link instead of a button
 */
export function LogoutLink({ 
    className = '', 
    style = {},
    ...props 
}) {
    const linkStyle = {
        color: '#dc3545',
        textDecoration: 'underline',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: '0',
        font: 'inherit',
        ...style
    };

    return (
        <LogoutButton
            {...props}
            className={`logout-link ${className}`}
            style={linkStyle}
        />
    );
}

/**
 * User Menu Logout Button Component
 * Designed for dropdown menus with user info
 */
export function UserMenuLogoutButton(props) {
    const { user } = useAuth();
    
    return (
        <div style={{ padding: '8px 0' }}>
            {user && (
                <div style={{ 
                    padding: '4px 16px', 
                    fontSize: '14px', 
                    color: '#666',
                    borderBottom: '1px solid #eee',
                    marginBottom: '8px'
                }}>
                    Signed in as <strong>{user.name || user.email}</strong>
                </div>
            )}
            <LogoutButton
                {...props}
                style={{
                    width: '100%',
                    margin: '0',
                    textAlign: 'left',
                    ...props.style
                }}
            />
        </div>
    );
}

export default LogoutButton;