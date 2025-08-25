/**
 * TypeScript type definitions for AWS STS operations and console integration
 * Provides comprehensive typing for AWS assume-role-with-web-identity functionality
 */

export interface AWSSTSAssumeRoleRequest {
  /** The Amazon Resource Name (ARN) of the role to assume */
  RoleArn: string;
  /** An identifier for the assumed role session */
  RoleSessionName: string;
  /** The OAuth 2.0 access token or OpenID Connect ID token */
  WebIdentityToken: string;
  /** The duration, in seconds, of the role session (900-43200 seconds) */
  DurationSeconds?: number;
  /** IAM policy in JSON format that you want to use as an inline session policy */
  Policy?: string;
  /** The Amazon Resource Names (ARNs) of the IAM managed policies */
  PolicyArns?: Array<{
    arn?: string;
  }>;
}

export interface AWSCredentials {
  /** The access key ID that identifies the temporary security credentials */
  AccessKeyId: string;
  /** The secret access key that can be used to sign requests */
  SecretAccessKey: string;
  /** The token that users must pass to the service API to use the temporary credentials */
  SessionToken: string;
  /** The date on which the current credentials expire */
  Expiration: Date;
}

export interface AWSAssumedRoleUser {
  /** The ARN of the temporary security credentials that are returned from the AssumeRole action */
  AssumedRoleId: string;
  /** The ARN of the temporary security credentials that are returned from the AssumeRole action */
  Arn: string;
}

export interface AWSSTSAssumeRoleResponse {
  /** The temporary security credentials */
  Credentials?: AWSCredentials;
  /** The Amazon Resource Name (ARN) and the assumed role ID */
  AssumedRoleUser?: AWSAssumedRoleUser;
  /** A percentage value that indicates the packed size of the session policies and session tags combined */
  PackedPolicySize?: number;
  /** The source identity specified by the principal */
  SourceIdentity?: string;
}

export interface AWSSTSErrorResponse {
  /** Error response from AWS STS */
  Error: {
    /** Error code */
    Code: string;
    /** Error message */
    Message: string;
    /** Error type */
    Type?: string;
  };
  /** Request ID */
  RequestId: string;
}

export interface AWSConsoleCredentials {
  /** AWS access key ID */
  sessionId: string;
  /** AWS secret access key */
  sessionKey: string;
  /** AWS session token */
  sessionToken: string;
}

export interface AWSConsoleFederationRequest {
  /** AWS session credentials */
  Session: string;
  /** The destination URL to which users are directed after signing in */
  Destination?: string;
}

export interface AWSConsoleFederationResponse {
  /** The URL that users can use to sign in to the console */
  SigninToken: string;
}

export interface RoleArnHistoryItem {
  /** The role ARN */
  arn: string;
  /** The friendly name for the role (extracted from ARN) */
  name: string;
  /** The AWS account ID */
  accountId: string;
  /** Timestamp when this role was last used */
  lastUsed: number;
  /** Number of times this role has been used */
  useCount: number;
}

export interface RoleArnHistory {
  /** Array of previously used role ARNs */
  roles: RoleArnHistoryItem[];
  /** Maximum number of roles to keep in history */
  maxItems: number;
}

export interface AWSSessionInfo {
  /** The role ARN that was assumed */
  roleArn: string;
  /** The session name that was used */
  sessionName: string;
  /** AWS credentials */
  credentials: AWSCredentials;
  /** Timestamp when the session was created */
  createdAt: number;
  /** GitHub user information used for the session */
  githubUser: {
    login?: string;
    email?: string;
    name?: string;
    sub: string;
  };
}

export interface AWSConfig {
  /** AWS region to use for STS calls */
  region: string;
  /** Default session duration in seconds */
  defaultDurationSeconds: number;
  /** AWS console base URL */
  consoleBaseUrl: string;
  /** STS endpoint URL */
  stsEndpoint: string;
  /** Console federation endpoint */
  federationEndpoint: string;
  /** Optional proxy endpoint for federation getSigninToken calls to bypass CORS */
  federationEndpointProxy?: string;
}

export interface AWSError extends Error {
  /** AWS error code */
  code: string;
  /** AWS request ID */
  requestId?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Original AWS error response */
  awsError?: AWSSTSErrorResponse;
}

// Utility types
export type AWSRegion = string;
export type RoleSessionName = string;
export type DurationSeconds = number;

// Validation patterns
export const AWS_ROLE_ARN_PATTERN = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/;
export const AWS_SESSION_NAME_PATTERN = /^[\w+=,.@-]+$/;

// Constants
export const AWS_CONSTANTS = {
  MIN_DURATION_SECONDS: 900, // 15 minutes
  MAX_DURATION_SECONDS: 43200, // 12 hours
  DEFAULT_DURATION_SECONDS: 3600, // 1 hour
  DEFAULT_REGION: 'us-east-1',
  MAX_ROLE_HISTORY: 10,
  SESSION_NAME_MAX_LENGTH: 64,
  CONSOLE_BASE_URL: 'https://console.aws.amazon.com',
  STS_ENDPOINT: 'https://sts.amazonaws.com',
  FEDERATION_ENDPOINT: 'https://signin.aws.amazon.com/federation'
} as const;