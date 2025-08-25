/**
 * Login Button Component
 * Provides a button to initiate OAuth2 authentication flow
 */

import React, { MouseEvent, ButtonHTMLAttributes } from 'react';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Login Button Component Props
 */
interface LoginButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Additional CSS classes */
  className?: string;
  /** Button text (default: "Login") */
  text?: string;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Additional click handler */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Login Button Component
 * @param props - Component props
 * @returns Login button component
 */
export function LoginButton({ 
    className = '', 
    text = 'Login', 
    disabled = false, 
    onClick,
    style = {},
    ...props 
}: LoginButtonProps): JSX.Element | null {
    const { login, isLoading, isAuthenticated, error } = useAuth();

    const handleClick = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
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

    const defaultStyle: React.CSSProperties = {
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
                    (e.target as HTMLButtonElement).style.backgroundColor = hoverStyle.backgroundColor;
                }
            }}
            onMouseLeave={(e) => {
                if (!isDisabled) {
                    (e.target as HTMLButtonElement).style.backgroundColor = defaultStyle.backgroundColor || '#24292e';
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
export function CompactLoginButton(props: LoginButtonProps): JSX.Element | null {
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
export function LargeLoginButton(props: LoginButtonProps): JSX.Element | null {
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