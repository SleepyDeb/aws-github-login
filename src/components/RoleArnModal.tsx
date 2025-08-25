/**
 * Role ARN Modal Component
 * Modal dialog for selecting or entering AWS IAM Role ARNs
 * Provides dropdown for previously used role ARNs and input for new ones
 */

import React, { useState, useEffect, useCallback } from 'react';
import { roleArnStorage, roleArnUtils } from '../services/roleArnStorage.js';
import { useAuthContext } from '../contexts/AuthContext.js';
import type { RoleArnHistoryItem } from '../types/aws.js';

interface RoleArnModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when a role ARN is selected */
    onRoleArnSelected: (roleArn: string) => void;
    /** Whether the selection process is loading */
    isLoading?: boolean;
    /** Error message to display */
    error?: string | null;
    /** Title of the modal */
    title?: string;
}

/**
 * Role ARN Modal Component
 */
export function RoleArnModal({
    isOpen,
    onClose,
    onRoleArnSelected,
    isLoading = false,
    error = null,
    title = 'Select AWS Role'
}: RoleArnModalProps): JSX.Element | null {
    const { user: currentUser } = useAuthContext();
    const [roleArn, setRoleArn] = useState<string>('');
    const [selectedFromDropdown, setSelectedFromDropdown] = useState<string>('');
    const [roleHistory, setRoleHistory] = useState<RoleArnHistoryItem[]>([]);
    const [validationError, setValidationError] = useState<string>('');
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [showTutorial, setShowTutorial] = useState<boolean>(false);
    const [tutorialStep, setTutorialStep] = useState<number>(0);

    // Get OAuth configuration for tutorial
    const getOAuthConfig = useCallback(() => {
        const env = import.meta.env;
        return {
            authority: env.VITE_OAUTH_AUTHORITY || env.OAUTH_AUTHORITY || '',
            clientId: env.VITE_OAUTH_CLIENT_ID || env.OAUTH_CLIENT_ID || '',
            scope: env.VITE_OAUTH_SCOPE || env.OAUTH_SCOPE || ''
        };
    }, []);

    // Tutorial steps configuration
    const getTutorialSteps = useCallback(() => {
        const config = getOAuthConfig();
        
        // Extract domain from authority URL for OIDC provider
        const authorityDomain = config.authority ? new URL(config.authority).hostname : 'your-provider.com';
        
        return [
            {
                title: "Step 1: Register OIDC Identity Provider",
                content: (
                    <div>
                        <p><strong>Register your OAuth provider as an Identity Provider in AWS IAM:</strong></p>
                        <ol>
                            <li>Go to <a href="https://console.aws.amazon.com/iam/home#/identity_providers" target="_blank" rel="noopener noreferrer">AWS IAM → Identity providers</a></li>
                            <li>Click <strong>"Add provider"</strong></li>
                            <li>Select <strong>"OpenID Connect"</strong></li>
                            <li>Provider URL: <code style={{backgroundColor: '#f5f5f5', padding: '2px 4px'}}>{config.authority || 'https://your-provider.com'}</code></li>
                            <li>Audience: <code style={{backgroundColor: '#f5f5f5', padding: '2px 4px'}}>{config.clientId || 'your-client-id'}</code></li>
                        </ol>
                        <div style={{backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', padding: '8px', marginTop: '12px'}}>
                            <strong>⚠️ Important:</strong> Use exactly these values from your current configuration.
                        </div>
                    </div>
                )
            },
            {
                title: "Step 2: Create IAM Role",
                content: (
                    <div>
                        <p><strong>Create an IAM role that can be assumed using your OIDC tokens:</strong></p>
                        <ol>
                            <li>Go to <a href="https://console.aws.amazon.com/iam/home#/roles" target="_blank" rel="noopener noreferrer">AWS IAM → Roles</a></li>
                            <li>Click <strong>"Create role"</strong></li>
                            <li>Select <strong>"Web identity"</strong> as trusted entity</li>
                            <li>Choose your identity provider: <code style={{backgroundColor: '#f5f5f5', padding: '2px 4px'}}>{authorityDomain}</code></li>
                            <li>Select audience: <code style={{backgroundColor: '#f5f5f5', padding: '2px 4px'}}>{config.clientId || 'your-client-id'}</code></li>
                        </ol>
                    </div>
                )
            },
            {
                title: "Step 3: Configure Trust Policy",
                content: (
                    <div>
                        <p><strong>Set up the trust policy with proper security conditions:</strong></p>
                        <div style={{backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', padding: '12px', margin: '8px 0'}}>
                            <pre style={{margin: 0, fontSize: '12px', overflow: 'auto'}}>
{`{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::ACCOUNT-ID:oidc-provider/${authorityDomain}/"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "${authorityDomain}/:aud": "${config.clientId || 'your-client-id'}",
                    "${authorityDomain}/:email": "${currentUser?.email || 'your-email@example.com'}"
                }
            }
        }
    ]
}`}
                            </pre>
                        </div>
                        <div style={{backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', padding: '8px', marginTop: '12px'}}>
                            <strong>💡 Tip:</strong> Replace ACCOUNT-ID with your AWS account ID and adjust the email condition as needed.
                        </div>
                    </div>
                )
            },
            {
                title: "Step 4: Attach Permissions",
                content: (
                    <div>
                        <p><strong>Attach appropriate permission policies to the role:</strong></p>
                        <ul>
                            <li><strong>For testing:</strong> Start with <code>ReadOnlyAccess</code></li>
                            <li><strong>For production:</strong> Create custom policies with minimal required permissions</li>
                        </ul>
                        <p><strong>Complete the role creation and copy the Role ARN:</strong></p>
                        <div style={{backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px', margin: '8px 0'}}>
                            <code>arn:aws:iam::123456789012:role/your-role-name</code>
                        </div>
                    </div>
                )
            }
        ];
    }, [getOAuthConfig, currentUser]);

    // Tutorial navigation functions
    const nextTutorialStep = () => {
        const steps = getTutorialSteps();
        if (tutorialStep < steps.length - 1) {
            setTutorialStep(tutorialStep + 1);
        }
    };

    const prevTutorialStep = () => {
        if (tutorialStep > 0) {
            setTutorialStep(tutorialStep - 1);
        }
    };

    const closeTutorial = () => {
        setShowTutorial(false);
        setTutorialStep(0);
    };

    // Load role history when modal opens
    useEffect(() => {
        if (isOpen) {
            const history = roleArnStorage.getRoleArns();
            setRoleHistory(history);
            
            // Auto-fill with most recent role if available
            if (history.length > 0 && !roleArn) {
                const mostRecent = roleArnStorage.getMostRecentRoleArn();
                if (mostRecent) {
                    setRoleArn(mostRecent);
                    setSelectedFromDropdown(mostRecent);
                }
            }
        }
    }, [isOpen, roleArn]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setRoleArn('');
            setSelectedFromDropdown('');
            setValidationError('');
            setShowDropdown(false);
            setShowTutorial(false);
            setTutorialStep(0);
        }
    }, [isOpen]);

    // Validate role ARN
    const validateRoleArn = useCallback((arn: string): string => {
        if (!arn.trim()) {
            return 'Role ARN is required';
        }
        
        if (!roleArnUtils.isValidRoleArn(arn.trim())) {
            return 'Invalid AWS IAM Role ARN format. Expected: arn:aws:iam::123456789012:role/RoleName';
        }
        
        return '';
    }, []);

    // Handle input change
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setRoleArn(value);
        setSelectedFromDropdown('');
        
        // Clear validation error when user starts typing
        if (validationError) {
            setValidationError('');
        }
    };

    // Handle dropdown selection
    const handleDropdownSelect = (selectedArn: string) => {
        setRoleArn(selectedArn);
        setSelectedFromDropdown(selectedArn);
        setShowDropdown(false);
        setValidationError('');
    };

    // Handle form submission
    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        
        const trimmedArn = roleArn.trim();
        const validation = validateRoleArn(trimmedArn);
        
        if (validation) {
            setValidationError(validation);
            return;
        }
        
        onRoleArnSelected(trimmedArn);
    };

    // Handle modal backdrop click
    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    // Don't render if not open
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="role-arn-modal-backdrop"
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
        >
            <div 
                className="role-arn-modal"
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    minWidth: '500px',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{title}</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => setShowTutorial(!showTutorial)}
                            style={{
                                background: showTutorial ? '#0366d6' : '#f6f8fa',
                                border: '1px solid #d0d7de',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: showTutorial ? 'white' : '#24292f'
                            }}
                            title="Show setup tutorial"
                        >
                            📚 Setup Guide
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '0',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                            }}
                            title="Close"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Tutorial Section */}
                {showTutorial && (
                    <div style={{
                        backgroundColor: '#f6f8fa',
                        border: '1px solid #d0d7de',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                AWS IAM Role Setup Tutorial
                            </h3>
                            <button
                                onClick={closeTutorial}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                                title="Close tutorial"
                            >
                                ×
                            </button>
                        </div>

                        {/* Tutorial Progress */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#656d76' }}>
                                    Step {tutorialStep + 1} of {getTutorialSteps().length}
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#e1e4e8',
                                borderRadius: '2px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${((tutorialStep + 1) / getTutorialSteps().length) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#0366d6',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>

                        {/* Tutorial Content */}
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            padding: '16px',
                            marginBottom: '16px',
                            minHeight: '200px'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#0366d6' }}>
                                {getTutorialSteps()[tutorialStep]?.title}
                            </h4>
                            <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#24292f' }}>
                                {getTutorialSteps()[tutorialStep]?.content}
                            </div>
                        </div>

                        {/* Tutorial Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={prevTutorialStep}
                                disabled={tutorialStep === 0}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #d0d7de',
                                    borderRadius: '6px',
                                    backgroundColor: tutorialStep === 0 ? '#f6f8fa' : 'white',
                                    cursor: tutorialStep === 0 ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    opacity: tutorialStep === 0 ? 0.6 : 1
                                }}
                            >
                                ← Previous
                            </button>
                            
                            <div style={{ fontSize: '11px', color: '#656d76' }}>
                                Need help? Check the full{' '}
                                <a
                                    href="/AWS_OIDC_FEDERATION_SETUP.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#0366d6' }}
                                >
                                    detailed guide
                                </a>
                            </div>

                            <button
                                onClick={nextTutorialStep}
                                disabled={tutorialStep === getTutorialSteps().length - 1}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #d0d7de',
                                    borderRadius: '6px',
                                    backgroundColor: tutorialStep === getTutorialSteps().length - 1 ? '#f6f8fa' : 'white',
                                    cursor: tutorialStep === getTutorialSteps().length - 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    opacity: tutorialStep === getTutorialSteps().length - 1 ? 0.6 : 1
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div style={{
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: '#c33'
                    }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Previous roles dropdown */}
                    {roleHistory.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Previously Used Roles:
                            </label>
                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        backgroundColor: 'white',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ color: selectedFromDropdown ? '#333' : '#666' }}>
                                        {selectedFromDropdown 
                                            ? roleArnUtils.formatRoleArnForDisplay(selectedFromDropdown)
                                            : 'Select a previously used role...'
                                        }
                                    </span>
                                    <span>{showDropdown ? '▲' : '▼'}</span>
                                </button>

                                {showDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: 'white',
                                        border: '1px solid #ddd',
                                        borderTop: 'none',
                                        borderRadius: '0 0 4px 4px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 1001
                                    }}>
                                        {roleHistory.map((role, index) => (
                                            <div
                                                key={role.arn}
                                                onClick={() => handleDropdownSelect(role.arn)}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: index < roleHistory.length - 1 ? '1px solid #eee' : 'none',
                                                    backgroundColor: selectedFromDropdown === role.arn ? '#f0f8ff' : 'white'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (selectedFromDropdown !== role.arn) {
                                                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedFromDropdown !== role.arn) {
                                                        e.currentTarget.style.backgroundColor = 'white';
                                                    }
                                                }}
                                            >
                                                <div style={{ fontWeight: '500' }}>{role.name}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    Account: {role.accountId} • Used {role.useCount} time{role.useCount !== 1 ? 's' : ''}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                                                    {role.arn}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Role ARN input */}
                    <div style={{ marginBottom: '16px' }}>
                        <label 
                            htmlFor="roleArn" 
                            style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}
                        >
                            AWS IAM Role ARN:
                        </label>
                        <input
                            id="roleArn"
                            type="text"
                            value={roleArn}
                            onChange={handleInputChange}
                            placeholder="arn:aws:iam::123456789012:role/YourRoleName"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: `1px solid ${validationError ? '#f56565' : '#ddd'}`,
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                backgroundColor: validationError ? '#fef5e7' : 'white'
                            }}
                            disabled={isLoading}
                        />
                        {validationError && (
                            <div style={{ color: '#f56565', fontSize: '12px', marginTop: '4px' }}>
                                {validationError}
                            </div>
                        )}
                    </div>

                    {/* Enhanced Help text */}
                    <div style={{ marginBottom: '20px' }}>
                        {!showTutorial && roleHistory.length === 0 && (
                            <div style={{
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffeaa7',
                                borderRadius: '6px',
                                padding: '12px',
                                marginBottom: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '16px' }}>💡</span>
                                    <strong style={{ fontSize: '13px', color: '#856404' }}>First time setup?</strong>
                                </div>
                                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#856404' }}>
                                    You'll need to create an AWS IAM role first. Click the <strong>"📚 Setup Guide"</strong> button above for step-by-step instructions.
                                </p>
                            </div>
                        )}

                        <div style={{ fontSize: '12px', color: '#666' }}>
                            <p style={{ margin: '0 0 8px 0' }}>
                                <strong>Role ARN Format:</strong> <code style={{backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px'}}>arn:aws:iam::ACCOUNT-ID:role/ROLE-NAME</code>
                            </p>
                            <p style={{ margin: '0 0 8px 0' }}>
                                This role must trust your OIDC provider and have the necessary permissions for console access.
                            </p>
                            
                            {/* Dynamic help based on OAuth config */}
                            {(() => {
                                const config = getOAuthConfig();
                                const authorityDomain = config.authority ? new URL(config.authority).hostname : null;
                                
                                if (authorityDomain && config.clientId) {
                                    return (
                                        <div style={{
                                            backgroundColor: '#f0f8ff',
                                            border: '1px solid #c3d9ff',
                                            borderRadius: '4px',
                                            padding: '8px',
                                            marginTop: '8px'
                                        }}>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#0366d6' }}>
                                                Your Configuration:
                                            </p>
                                            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0366d6' }}>
                                                OIDC Provider: <code>{authorityDomain}</code>
                                            </p>
                                            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#0366d6' }}>
                                                Client ID: <code>{config.clientId}</code>
                                            </p>
                                            {currentUser?.email && (
                                                <p style={{ margin: '0', fontSize: '11px', color: '#0366d6' }}>
                                                    Current User: <code>{currentUser.email}</code>
                                                </p>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            style={{
                                padding: '10px 20px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.6 : 1
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !roleArn.trim()}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: isLoading || !roleArn.trim() ? '#ccc' : '#0366d6',
                                color: 'white',
                                cursor: isLoading || !roleArn.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isLoading && (
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid transparent',
                                    borderTop: '2px solid white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                            )}
                            {isLoading ? 'Opening Console...' : 'Open AWS Console'}
                        </button>
                    </div>
                </form>

                {/* Spinner animation */}
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
            </div>
        </div>
    );
}

export default RoleArnModal;