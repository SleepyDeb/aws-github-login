/**
 * Credential Exporter Component
 * Provides UI for exporting AWS credentials in different shell formats
 * Supports Bash, Windows CMD, and PowerShell export formats
 */

import React, { useState } from 'react';
import { 
    formatCredentialsForBash, 
    formatCredentialsForCmd, 
    formatCredentialsForPowershell,
    copyToClipboard,
    EXPORT_FORMATS 
} from '../utils/credentialExporter.js';
import type { AWSCredentials, AWSSessionInfo } from '../types/aws.js';

interface CredentialExporterProps {
    /** AWS credentials to export */
    credentials: AWSCredentials;
    /** AWS session information */
    sessionInfo: AWSSessionInfo;
    /** Callback when export is closed */
    onClose: () => void;
    /** Callback when credentials are successfully exported */
    onSuccess?: () => void;
    /** Whether to show the export interface inline or as a separate modal */
    inline?: boolean;
}

/**
 * Credential Exporter Component
 */
export function CredentialExporter({
    credentials,
    sessionInfo,
    onClose,
    onSuccess,
    inline = false
}: CredentialExporterProps): JSX.Element {
    const [selectedFormat, setSelectedFormat] = useState<'bash' | 'cmd' | 'powershell'>('bash');
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);

    // Format credentials based on selected format
    const getFormattedCredentials = (): string => {
        const creds = {
            AccessKeyId: credentials.AccessKeyId,
            SecretAccessKey: credentials.SecretAccessKey,
            SessionToken: credentials.SessionToken
        };

        switch (selectedFormat) {
            case 'bash':
                return formatCredentialsForBash(creds);
            case 'cmd':
                return formatCredentialsForCmd(creds);
            case 'powershell':
                return formatCredentialsForPowershell(creds);
            default:
                return formatCredentialsForBash(creds);
        }
    };

    // Handle copy to clipboard
    const handleCopy = async (): Promise<void> => {
        try {
            setCopyError(null);
            const formattedCredentials = getFormattedCredentials();
            await copyToClipboard(formattedCredentials);
            
            setCopySuccess(`Copied ${selectedFormat.toUpperCase()} credentials to clipboard!`);
            
            // Clear success message after 3 seconds
            setTimeout(() => setCopySuccess(null), 3000);
            
            // Call success callback if provided
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Failed to copy credentials:', error);
            setCopyError('Failed to copy to clipboard. Please copy manually.');
            
            // Clear error message after 5 seconds
            setTimeout(() => setCopyError(null), 5000);
        }
    };

    // Handle format selection
    const handleFormatChange = (format: 'bash' | 'cmd' | 'powershell') => {
        setSelectedFormat(format);
        setCopySuccess(null);
        setCopyError(null);
    };

    // Get formatted display for credentials (masked for security)
    const getMaskedCredentials = (): string => {
        const lines = getFormattedCredentials().split('\n');
        return lines.map(line => {
            if (line.includes('=')) {
                const [key, value] = line.split('=');
                const cleanValue = value.replace(/"/g, '');
                if (cleanValue.length > 8) {
                    const masked = cleanValue.substring(0, 4) + '...' + cleanValue.substring(cleanValue.length - 4);
                    return `${key}="${masked}"`;
                }
            }
            return line;
        }).join('\n');
    };

    const containerStyle: React.CSSProperties = inline ? {
        padding: '16px',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        backgroundColor: '#f6f8fa'
    } : {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        minWidth: '500px',
        maxWidth: '600px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                    📋 Export AWS Credentials
                </h3>
                {!inline && (
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
                )}
            </div>

            {/* Session Info */}
            <div style={{
                backgroundColor: '#f0f8ff',
                border: '1px solid #c3d9ff',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ fontSize: '12px', color: '#0366d6', fontWeight: '500' }}>
                    Session Information:
                </div>
                <div style={{ fontSize: '11px', color: '#24292f', marginTop: '4px' }}>
                    <div><strong>Role:</strong> {sessionInfo.roleArn}</div>
                    <div><strong>Session:</strong> {sessionInfo.sessionName}</div>
                    <div><strong>Expires:</strong> {credentials.Expiration.toLocaleString()}</div>
                </div>
            </div>

            {/* Format Selection */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Select Export Format:
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {EXPORT_FORMATS.map(format => (
                        <label key={format.format} style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            border: `2px solid ${selectedFormat === format.format ? '#0366d6' : '#e1e4e8'}`,
                            borderRadius: '6px',
                            backgroundColor: selectedFormat === format.format ? '#f0f8ff' : 'white',
                            transition: 'all 0.2s ease'
                        }}>
                            <input
                                type="radio"
                                name="exportFormat"
                                value={format.format}
                                checked={selectedFormat === format.format}
                                onChange={(e) => handleFormatChange(e.target.value as 'bash' | 'cmd' | 'powershell')}
                                style={{ marginRight: '8px' }}
                            />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>{format.label}</div>
                                <div style={{ fontSize: '11px', color: '#656d76' }}>{format.description}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Credentials Preview */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Preview (sensitive values masked):
                </label>
                <div style={{
                    backgroundColor: '#f6f8fa',
                    border: '1px solid #e1e4e8',
                    borderRadius: '6px',
                    padding: '12px',
                    fontFamily: 'Monaco, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto',
                    maxHeight: '120px'
                }}>
                    {getMaskedCredentials()}
                </div>
            </div>

            {/* Success/Error Messages */}
            {copySuccess && (
                <div style={{
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '12px',
                    color: '#155724',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>✅</span>
                    {copySuccess}
                </div>
            )}

            {copyError && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '12px',
                    color: '#721c24',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>❌</span>
                    {copyError}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {!inline && (
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 16px',
                            border: '1px solid #d0d7de',
                            borderRadius: '6px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Close
                    </button>
                )}
                <button
                    onClick={handleCopy}
                    style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#0366d6',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    📋 Copy {selectedFormat.toUpperCase()} Commands
                </button>
            </div>

            {/* Usage Instructions */}
            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#856404'
            }}>
                <strong>💡 Usage:</strong> After copying, paste these commands into your terminal to set AWS credentials for CLI/SDK usage. 
                Credentials expire at <strong>{credentials.Expiration.toLocaleString()}</strong>.
            </div>
        </div>
    );
}

export default CredentialExporter;