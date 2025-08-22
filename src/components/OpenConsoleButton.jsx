/**
 * Open Console Button Component
 * Placeholder component for future console functionality
 * Currently renders a button that will be used for admin/console access
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Open Console Button Component
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.text] - Button text (default: "Open Console")
 * @param {boolean} [props.disabled] - Whether button is disabled
 * @param {Function} [props.onClick] - Click handler for future functionality
 * @param {Object} [props.style] - Inline styles
 * @returns {React.Component} Open Console button component
 */
export function OpenConsoleButton({ 
    className = '', 
    text = 'Open Console', 
    disabled = false, 
    onClick,
    style = {},
    ...props 
}) {
    const { isAuthenticated, user } = useAuth();

    const handleClick = async (event) => {
        try {
            console.log('OpenConsole button clicked - functionality to be implemented');
            console.log('Current user:', user);
            
            // Placeholder for future console functionality
            // This could open an admin panel, developer console, or management interface
            
            // Call additional click handler if provided
            if (onClick) {
                await onClick(event);
            }
            
            // TODO: Implement console opening logic here
            // Examples of what this might do:
            // - Open a new window/tab to an admin console
            // - Show a modal with debug information
            // - Navigate to a management dashboard
            // - Display user profile and session details
            
        } catch (err) {
            console.error('OpenConsole button click failed:', err);
        }
    };

    // Only show console button if user is authenticated
    if (!isAuthenticated) {
        return null;
    }

    const defaultStyle = {
        backgroundColor: '#0366d6',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        fontSize: '16px',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        opacity: disabled ? 0.6 : 1,
        marginLeft: '8px',
        ...style
    };

    const hoverStyle = {
        backgroundColor: '#0256cc'
    };

    return (
        <button
            type="button"
            className={`open-console-button ${className}`}
            onClick={handleClick}
            disabled={disabled}
            style={defaultStyle}
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.target.style.backgroundColor = hoverStyle.backgroundColor;
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.target.style.backgroundColor = defaultStyle.backgroundColor;
                }
            }}
            title="Open console (functionality coming soon)"
            {...props}
        >
            {text}
        </button>
    );
}

/**
 * Compact Open Console Button Component
 * Smaller version for navigation bars or compact layouts
 */
export function CompactOpenConsoleButton(props) {
    return (
        <OpenConsoleButton
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
 * Icon-only Open Console Button Component
 * Shows only an icon for very compact layouts
 */
export function IconOpenConsoleButton(props) {
    return (
        <OpenConsoleButton
            {...props}
            text="⚙️"
            style={{
                padding: '8px',
                fontSize: '16px',
                minWidth: '36px',
                ...props.style
            }}
            title="Open Console"
        />
    );
}

/**
 * Debug Console Button Component
 * Special variant that shows current session debug info when clicked
 */
export function DebugConsoleButton(props) {
    const { getDebugInfo } = useAuth();
    
    const handleDebugClick = () => {
        const debugInfo = getDebugInfo();
        console.group('🔍 Auth Debug Information');
        console.log('Authentication Status:', debugInfo);
        console.log('Session Data:', debugInfo.session);
        console.log('Debug Info:', debugInfo.debugInfo);
        console.groupEnd();
        
        // Also show in alert for easy viewing (development only)
        if (process.env.NODE_ENV === 'development') {
            alert(`Auth Debug Info:\n${JSON.stringify(debugInfo, null, 2)}`);
        }
    };
    
    return (
        <OpenConsoleButton
            {...props}
            text={props.text || '🐛 Debug'}
            onClick={handleDebugClick}
            style={{
                backgroundColor: '#6f42c1',
                ...props.style
            }}
            title="Show debug information"
        />
    );
}

export default OpenConsoleButton;