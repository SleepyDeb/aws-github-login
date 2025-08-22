/**
 * Login Button Component
 * Provides a button to initiate OAuth2 authentication flow
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Login Button Component
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.text] - Button text (default: "Login")
 * @param {boolean} [props.disabled] - Whether button is disabled
 * @param {Function} [props.onClick] - Additional click handler
 * @param {Object} [props.style] - Inline styles
 * @returns {React.Component} Login button component
 */
export function LoginButton({ 
    className = '', 
    text = 'Login', 
    disabled = false, 
    onClick,
    style = {},
    ...props 
}) {
    const { login, isLoading, isAuthenticated, error } = useAuth();

    const handleClick = async (event) => {
        try {
            // Call additional click handler if provided
            if (onClick) {
                await onClick(event);
            }
            
            // Start OAuth login flow
            await login();
        } catch (err) {
            console.error('Login button click failed:', err);
        }
    };

    // Don't show login button if already authenticated
    if (isAuthenticated) {
        return null;
    }

    const isDisabled = disabled || isLoading;

    const defaultStyle = {
        backgroundColor: '#24292e',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        fontSize: '16px',
        borderRadius: '6px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        opacity: isDisabled ? 0.6 : 1,
        ...style
    };

    const hoverStyle = {
        backgroundColor: '#444'
    };

    return (
        <button
            type="button"
            className={`login-button ${className}`}
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
            title={error ? `Login error: ${error}` : 'Sign in with OAuth provider'}
            {...props}
        >
            {isLoading ? 'Logging in...' : text}
        </button>
    );
}

/**
 * Compact Login Button Component
 * Smaller version for navigation bars or compact layouts
 */
export function CompactLoginButton(props) {
    return (
        <LoginButton
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
 * Large Login Button Component
 * Bigger version for landing pages or prominent placement
 */
export function LargeLoginButton(props) {
    return (
        <LoginButton
            {...props}
            style={{
                padding: '12px 24px',
                fontSize: '18px',
                fontWeight: 'bold',
                ...props.style
            }}
        />
    );
}

export default LoginButton;