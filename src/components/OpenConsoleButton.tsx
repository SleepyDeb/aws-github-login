/**
 * Open Console Button Component
 * Integrates with AWS STS to assume roles and open AWS console
 * Provides role ARN selection and management functionality
 */

import React, { MouseEvent, ButtonHTMLAttributes, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { awsService } from '../services/awsService.js';
import { roleArnStorage } from '../services/roleArnStorage.js';
import RoleArnModal from './RoleArnModal.js';
import type { AWSError } from '../types/aws.js';

/**
 * Open Console Button Component Props
 */
interface OpenConsoleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Additional CSS classes */
  className?: string;
  /** Button text (default: "Open Console") */
  text?: string;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Click handler for future functionality */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Open Console Button Component
 * @param props - Component props
 * @returns Open Console button component
 */
export function OpenConsoleButton({ 
    className = '', 
    text = 'Open Console', 
    disabled = false, 
    onClick,
    style = {},
    ...props 
}: OpenConsoleButtonProps): JSX.Element | null {
    const { isAuthenticated, user, getIdToken } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
        try {
            console.log('AWS Console button clicked');
            console.log('Current user:', user);
            
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Clear any previous errors
            setError(null);
            
            // Open the role ARN selection modal
            setIsModalOpen(true);
            
            // Call additional click handler if provided
            if (onClick) {
                await onClick(event);
            }
            
        } catch (err) {
            console.error('OpenConsole button click failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to open console');
        }
    };

    const handleRoleArnSelected = async (roleArn: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);
            
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get the GitHub ID token (JWT) to use as WebIdentityToken
            const idToken = getIdToken();
            if (!idToken) {
                throw new Error('No ID token available. Please re-authenticate.');
            }

            console.log('Assuming AWS role:', roleArn);
            
            // Add role ARN to history
            roleArnStorage.addRoleArn(roleArn);

            // Assume role and generate console URL
            const result = await awsService.assumeRoleAndOpenConsole(
                roleArn,
                user,
                idToken
            );

            console.log('AWS console URL generated:', result.consoleUrl);

            // Close modal
            setIsModalOpen(false);

            // Redirect to AWS console
            window.open(result.consoleUrl, '_blank', 'noopener,noreferrer');

        } catch (err) {
            console.error('Failed to assume role and open console:', err);
            
            let errorMessage = 'Failed to open AWS console';
            if (err instanceof Error) {
                const awsError = err as AWSError;
                if (awsError.code) {
                    switch (awsError.code) {
                        case 'InvalidIdentityToken':
                            errorMessage = 'GitHub ID token is invalid or expired. Please re-authenticate.';
                            break;
                        case 'AccessDenied':
                            errorMessage = 'Access denied. Check that the role trusts the GitHub OIDC provider and you have permission to assume it.';
                            break;
                        case 'TokenExpired':
                            errorMessage = 'ID token has expired. Please re-authenticate.';
                            break;
                        case 'AssumeRoleUnauthorizedOperation':
                            errorMessage = 'Unauthorized to assume this role. Check role permissions and trust policy.';
                            break;
                        case 'InvalidParameterValue':
                            errorMessage = 'Invalid ID token format. Ensure GitHub OIDC is properly configured.';
                            break;
                        default:
                            errorMessage = `AWS Error: ${awsError.message}`;
                    }
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalClose = (): void => {
        setIsModalOpen(false);
        setError(null);
        setIsLoading(false);
    };

    // Only show console button if user is authenticated
    if (!isAuthenticated) {
        return null;
    }

    const defaultStyle: React.CSSProperties = {
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
        <>
            <button
                type="button"
                className={`open-console-button ${className}`}
                onClick={handleClick}
                disabled={disabled}
                style={defaultStyle}
                onMouseEnter={(e) => {
                    if (!disabled) {
                        (e.target as HTMLButtonElement).style.backgroundColor = hoverStyle.backgroundColor;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!disabled) {
                        (e.target as HTMLButtonElement).style.backgroundColor = defaultStyle.backgroundColor || '#0366d6';
                    }
                }}
                title="Open AWS Console"
                {...props}
            >
                {text}
            </button>

            {/* Role ARN Selection Modal */}
            <RoleArnModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onRoleArnSelected={handleRoleArnSelected}
                isLoading={isLoading}
                error={error}
                title="Open AWS Console"
            />
        </>
    );
}

/**
 * Compact Open Console Button Component
 * Smaller version for navigation bars or compact layouts
 */
export function CompactOpenConsoleButton(props: OpenConsoleButtonProps): JSX.Element | null {
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
export function IconOpenConsoleButton(props: OpenConsoleButtonProps): JSX.Element | null {
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
export function DebugConsoleButton(props: OpenConsoleButtonProps): JSX.Element | null {
    const { getDebugInfo } = useAuth();
    const [showDebugModal, setShowDebugModal] = useState(false);
    
    const handleDebugClick = (): void => {
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

/**
 * AWS Console Button with Role Management
 * Extended version that shows role management options
 */
export function AWSConsoleButtonWithHistory(props: OpenConsoleButtonProps): JSX.Element | null {
    const { isAuthenticated } = useAuth();
    const [showHistory, setShowHistory] = useState(false);
    
    if (!isAuthenticated) {
        return null;
    }

    const roleHistory = roleArnStorage.getRoleArns();
    const hasHistory = roleHistory.length > 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <OpenConsoleButton {...props} />
            
            {hasHistory && (
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                    title="View role history"
                >
                    📋
                </button>
            )}
            
            {showHistory && hasHistory && (
                <div style={{
                    position: 'absolute',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '12px',
                    marginTop: '100px',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    minWidth: '300px'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Recent Roles:</h4>
                    {roleHistory.slice(0, 5).map((role, index) => (
                        <div key={role.arn} style={{
                            fontSize: '12px',
                            padding: '4px 0',
                            borderBottom: index < Math.min(roleHistory.length, 5) - 1 ? '1px solid #eee' : 'none'
                        }}>
                            <div style={{ fontWeight: '500' }}>{role.name}</div>
                            <div style={{ color: '#666' }}>Used {role.useCount} times</div>
                        </div>
                    ))}
                    <button
                        onClick={() => setShowHistory(false)}
                        style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '3px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

export default OpenConsoleButton;