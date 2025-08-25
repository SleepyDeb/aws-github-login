/**
 * AWS Service
 * Handles AWS STS assume-role-with-web-identity operations and console integration
 * Provides functionality to assume roles using GitHub OIDC tokens and generate console URLs
 */

import {
    STSClient,
    AssumeRoleWithWebIdentityCommand,
    type AssumeRoleWithWebIdentityCommandInput,
    type AssumeRoleWithWebIdentityCommandOutput,
    Credentials as AWSCredentials    
} from '@aws-sdk/client-sts';
import type {
    AWSConfig,
    AWSConsoleCredentials,
    AWSConsoleFederationResponse,
    AWSError,
    AWSSessionInfo
} from '../types/aws.js';
import type { UserInfo } from '../types/auth.js';
import { AWS_CONSTANTS, AWS_SESSION_NAME_PATTERN } from '../types/aws.js';

/**
 * AWS Service class for handling STS operations and console integration
 */
export class AWSService {
    private config: AWSConfig;
    private stsClient: STSClient;

    constructor(config?: Partial<AWSConfig>) {
        this.config = {
            region: config?.region || AWS_CONSTANTS.DEFAULT_REGION,
            defaultDurationSeconds: config?.defaultDurationSeconds || AWS_CONSTANTS.DEFAULT_DURATION_SECONDS,
            consoleBaseUrl: config?.consoleBaseUrl || AWS_CONSTANTS.CONSOLE_BASE_URL,
            stsEndpoint: config?.stsEndpoint || AWS_CONSTANTS.STS_ENDPOINT,
            federationEndpoint: config?.federationEndpoint || AWS_CONSTANTS.FEDERATION_ENDPOINT,
            ...(config?.federationEndpointProxy && { federationEndpointProxy: config.federationEndpointProxy })
        };

        // Initialize STS client (no credentials needed for AssumeRoleWithWebIdentity)
        this.stsClient = new STSClient({
            region: this.config.region
        });
    }

    /**
     * Generates a session name from GitHub user data
     * @param githubUser - GitHub user information
     * @returns A valid AWS session name
     */
    generateSessionName(githubUser: UserInfo): string {
        try {
            // Get username, fallback to subject or email
            const username = githubUser.login ||
                            githubUser.preferred_username ||
                            githubUser.email?.split('@')[0] ||
                            githubUser.sub?.replace(/[^a-zA-Z0-9]/g, '') ||
                            'github-user';

            // Clean username for AWS session name format
            const cleanUsername = username.replace(/[^a-zA-Z0-9+=,.@-]/g, '-');

            // Add timestamp to ensure uniqueness
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

            // Create session name: github-{username}-{timestamp}
            const sessionName = `github-${cleanUsername}-${timestamp}`;

            // Ensure it meets AWS requirements
            const finalSessionName = sessionName.slice(0, AWS_CONSTANTS.SESSION_NAME_MAX_LENGTH);

            // Validate against AWS pattern
            if (!AWS_SESSION_NAME_PATTERN.test(finalSessionName)) {
                console.warn('Generated session name might not be valid:', finalSessionName);
                // Fallback to safe session name
                return `github-user-${timestamp}`.slice(0, AWS_CONSTANTS.SESSION_NAME_MAX_LENGTH);
            }

            console.log('Generated AWS session name:', finalSessionName);
            return finalSessionName;
        } catch (error) {
            console.error('Failed to generate session name:', error);
            // Fallback session name
            const timestamp = Date.now().toString();
            return `github-session-${timestamp}`.slice(0, AWS_CONSTANTS.SESSION_NAME_MAX_LENGTH);
        }
    }

    /**
     * Creates an AWS error from a response or error object
     * @param error - Error object or AWS error response
     * @param context - Additional context for the error
     * @returns AWS error object
     */
    private createAWSError(error: any, context: string = ''): AWSError {
        let awsError: AWSError;

        if (error.name && error.message) {
            // AWS SDK error
            awsError = error as AWSError;
            awsError.code = error.name;
        } else if (error instanceof Error) {
            awsError = error as AWSError;
            awsError.code = awsError.code || 'UnknownError';
        } else {
            awsError = new Error(`${context}: ${String(error)}`) as AWSError;
            awsError.code = 'UnknownError';
        }

        awsError.name = 'AWSError';
        return awsError;
    }

    /**
     * Calls AWS STS AssumeRoleWithWebIdentity API using AWS SDK
     * @param roleArn - The ARN of the role to assume
     * @param webIdentityToken - The GitHub OIDC token (JWT)
     * @param sessionName - The session name for the assumed role
     * @param durationSeconds - Session duration in seconds
     * @returns AWS STS response with temporary credentials
     */
    async assumeRoleWithWebIdentity(
        roleArn: string,
        webIdentityToken: string,
        sessionName: string,
        durationSeconds: number = this.config.defaultDurationSeconds
    ): Promise<{ Credentials: AWSCredentials; AssumedRoleUser?: { AssumedRoleId: string; Arn: string } }> {
        try {
            console.log('Assuming AWS role with web identity:', {
                roleArn,
                sessionName,
                durationSeconds,
                region: this.config.region
            });

            // Validate inputs
            if (!roleArn || !webIdentityToken || !sessionName) {
                throw new Error('Missing required parameters for AssumeRoleWithWebIdentity');
            }

            if (durationSeconds < AWS_CONSTANTS.MIN_DURATION_SECONDS ||
                durationSeconds > AWS_CONSTANTS.MAX_DURATION_SECONDS) {
                throw new Error(`Duration must be between ${AWS_CONSTANTS.MIN_DURATION_SECONDS} and ${AWS_CONSTANTS.MAX_DURATION_SECONDS} seconds`);
            }

            // Prepare the command input
            const input: AssumeRoleWithWebIdentityCommandInput = {
                RoleArn: roleArn,
                RoleSessionName: sessionName,
                WebIdentityToken: webIdentityToken,
                DurationSeconds: durationSeconds
            };

            // Create and send the command
            const command = new AssumeRoleWithWebIdentityCommand(input);
            const response: AssumeRoleWithWebIdentityCommandOutput = await this.stsClient.send(command);

            // Validate response
            if (!response.Credentials) {
                throw new Error('No credentials received from AWS STS');
            }

            if (!response.Credentials.AccessKeyId || !response.Credentials.SecretAccessKey ||
                !response.Credentials.SessionToken || !response.Credentials.Expiration) {
                throw new Error('Incomplete credentials in AWS STS response');
            }

            // Convert AWS SDK response to our format
            const credentials: AWSCredentials = {
                AccessKeyId: response.Credentials.AccessKeyId,
                SecretAccessKey: response.Credentials.SecretAccessKey,
                SessionToken: response.Credentials.SessionToken,
                Expiration: response.Credentials.Expiration
            };

            const result: { Credentials: AWSCredentials; AssumedRoleUser?: { AssumedRoleId: string; Arn: string } } = {
                Credentials: credentials
            };

            // Add AssumedRoleUser info if available
            if (response.AssumedRoleUser?.AssumedRoleId && response.AssumedRoleUser?.Arn) {
                result.AssumedRoleUser = {
                    AssumedRoleId: response.AssumedRoleUser.AssumedRoleId,
                    Arn: response.AssumedRoleUser.Arn
                };
            }

            console.log('Successfully assumed AWS role');
            return result;

        } catch (error) {
            console.error('Failed to assume role with web identity:', error);
            throw this.createAWSError(error, 'AssumeRoleWithWebIdentity');
        }
    }

    /**
     * Generates AWS console federation URL
     * @param credentials - AWS temporary credentials
     * @param consoleUrl - Optional destination URL in the console
     * @returns URL for accessing AWS console
     */
    async generateConsoleUrl(
        credentials: AWSCredentials,
        consoleUrl?: string
    ): Promise<string> {
        try {
            console.log('Generating AWS console URL...');

            // Prepare credentials for federation
            const sessionCredentials: AWSConsoleCredentials = {
                sessionId: credentials.AccessKeyId!,
                sessionKey: credentials.SecretAccessKey!,
                sessionToken: credentials.SessionToken!
            };

            // Create session JSON
            const sessionData = JSON.stringify(sessionCredentials);

            // Get signin token from AWS federation endpoint (use proxy if available for CORS bypass)
            const federationParams = new URLSearchParams({
                Action: 'getSigninToken',
                Session: sessionData
            });

            const getSigninTokenEndpoint = this.config.federationEndpointProxy || this.config.federationEndpoint;
            const federationResponse = await fetch(
                `${getSigninTokenEndpoint}?${federationParams.toString()}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!federationResponse.ok) {
                throw new Error(`Federation request failed: ${federationResponse.status} ${federationResponse.statusText}`);
            }

            const federationData = await federationResponse.json() as AWSConsoleFederationResponse;

            if (!federationData.SigninToken) {
                throw new Error('No signin token received from federation endpoint');
            }

            // Generate the console URL
            const destination = consoleUrl || this.config.consoleBaseUrl;
            const consoleParams = new URLSearchParams({
                Action: 'login',
                Issuer: window.location.origin,
                Destination: destination,
                SigninToken: federationData.SigninToken
            });

            const finalConsoleUrl = `${this.config.federationEndpoint}?${consoleParams.toString()}`;

            console.log('Generated AWS console URL successfully');
            return finalConsoleUrl;

        } catch (error) {
            console.error('Failed to generate console URL:', error);
            throw this.createAWSError(error, 'Console URL generation');
        }
    }

    /**
     * Complete flow: assume role and open AWS console
     * @param roleArn - The ARN of the role to assume
     * @param githubUser - GitHub user information
     * @param webIdentityToken - GitHub OIDC token
     * @param consoleUrl - Optional destination URL in the console
     * @returns Session information and console URL
     */
    async assumeRoleAndOpenConsole(
        roleArn: string,
        githubUser: UserInfo,
        webIdentityToken: string,
        consoleUrl?: string
    ): Promise<{ sessionInfo: AWSSessionInfo; consoleUrl: string }> {
        try {
            console.log('Starting complete AWS console flow...');

            // Generate session name
            const sessionName = this.generateSessionName(githubUser);

            // Assume the role
            const stsResponse = await this.assumeRoleWithWebIdentity(
                roleArn,
                webIdentityToken,
                sessionName
            );

            if (!stsResponse.Credentials) {
                throw new Error('No credentials received from AWS STS');
            }

            // Create session info
            const sessionInfo: AWSSessionInfo = {
                roleArn,
                sessionName,
                credentials: {
                    AccessKeyId: stsResponse.Credentials.AccessKeyId!,
                    SecretAccessKey: stsResponse.Credentials.SecretAccessKey!,
                    SessionToken: stsResponse.Credentials.SessionToken!,
                    Expiration: stsResponse.Credentials.Expiration!
                },
                createdAt: Date.now(),
                githubUser: {
                    ...(githubUser.login && { login: githubUser.login }),
                    ...(githubUser.email && { email: githubUser.email }),
                    ...(githubUser.name && { name: githubUser.name }),
                    sub: githubUser.sub
                }
            };

            // Generate console URL
            const generatedConsoleUrl = await this.generateConsoleUrl(
                stsResponse.Credentials,
                consoleUrl
            );

            console.log('AWS console flow completed successfully');
            return {
                sessionInfo,
                consoleUrl: generatedConsoleUrl
            };

        } catch (error) {
            console.error('AWS console flow failed:', error);
            throw this.createAWSError(error, 'Complete AWS console flow');
        }
    }

    /**
     * Validates if credentials are still valid
     * @param credentials - AWS credentials to validate
     * @returns True if credentials are valid and not expired
     */
    isCredentialsValid(credentials: AWSCredentials): boolean {
        try {
            const expirationTime = credentials.Expiration?.getTime() ?? 0;
            const currentTime = Date.now();
            const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

            return expirationTime > (currentTime + bufferTime);
        } catch (error) {
            console.error('Failed to validate credentials:', error);
            return false;
        }
    }

    /**
     * Gets the AWS config
     * @returns Current AWS configuration
     */
    getConfig(): AWSConfig {
        return { ...this.config };
    }

    /**
     * Updates the AWS config
     * @param newConfig - New configuration values
     */
    updateConfig(newConfig: Partial<AWSConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }
}

// Create and export singleton instance with environment configuration
const federationEndpointProxy = import.meta.env.VITE_AWS_FEDERATION_ENDPOINT_PROXY;
export const awsService = new AWSService({
    ...(federationEndpointProxy && { federationEndpointProxy })
});

// Export utility functions
export const awsUtils = {
    /**
     * Formats AWS credentials expiration time
     */
    formatExpirationTime: (expiration: string): string => {
        try {
            const date = new Date(expiration);
            return date.toLocaleString();
        } catch {
            return 'Invalid date';
        }
    },

    /**
     * Gets time remaining until credentials expire
     */
    getTimeRemaining: (expiration: string): number => {
        try {
            const expirationTime = new Date(expiration).getTime();
            const currentTime = Date.now();
            return Math.max(0, expirationTime - currentTime);
        } catch {
            return 0;
        }
    },

    /**
     * Formats time remaining in human readable format
     */
    formatTimeRemaining: (expiration: string): string => {
        const remaining = awsUtils.getTimeRemaining(expiration);
        if (remaining === 0) return 'Expired';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
};