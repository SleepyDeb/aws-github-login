# AWS IAM OIDC Federation Setup Tutorial

This tutorial guides you through setting up AWS IAM federation with Auth0 (or any OIDC provider) to enable secure, temporary access to AWS resources using web identity tokens.

## Overview

**What you'll achieve:**
- Register an OIDC Identity Provider in AWS IAM
- Create an IAM role that can be assumed using OIDC tokens
- Configure proper trust policies with security conditions
- Enable users to access AWS Console through federated login

**Prerequisites:**
- AWS Account with IAM administrative permissions
- Auth0 account (or other OIDC provider) configured
- Basic understanding of IAM roles and policies

---

## Step 1: Register OIDC Identity Provider in AWS IAM

### 1.1 Navigate to IAM Identity Providers

1. Log into the **AWS Management Console**
2. Navigate to **IAM** → **Identity providers**
3. Click **"Add provider"**

### 1.2 Configure OIDC Provider

1. **Select Provider Type:** Choose **"OpenID Connect"**

2. **Provider URL:** Enter your Auth0 domain URL
   ```
   https://sleepydev.eu.auth0.com
   ```
   > ⚠️ **Important:** Use `https://` and do NOT include trailing slash

3. **Audience:** Enter your Auth0 Application Client ID
   ```
   XCaSnYut7Tl4ubdR7pKzkjBym19JRoBl
   ```

4. Click **"Add provider"**

### 1.3 Verify Provider Registration

After creation, you should see:
- **Provider:** `sleepydev.eu.auth0.com/`
- **Type:** `OpenID Connect`
- **ARN:** `arn:aws:iam::846173919647:oidc-provider/sleepydev.eu.auth0.com/`

---

## Step 2: Create IAM Role with Trust Policy

### 2.1 Create New Role

1. Go to **IAM** → **Roles**
2. Click **"Create role"**
3. Select **"Web identity"** as trusted entity type
4. **Identity provider:** Choose your OIDC provider (`sleepydev.eu.auth0.com`)
5. **Audience:** Select your client ID (`XCaSnYut7Tl4ubdR7pKzkjBym19JRoBl`)

### 2.2 Configure Trust Policy

Replace the default trust policy with this secure configuration:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::846173919647:oidc-provider/sleepydev.eu.auth0.com/"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "sleepydev.eu.auth0.com/:aud": "XCaSnYut7Tl4ubdR7pKzkjBym19JRoBl",
                    "sleepydev.eu.auth0.com/:email": "alessio.dimaria@gmail.com"
                }
            }
        }
    ]
}
```

### 2.3 Attach Permission Policies

For testing purposes, you can start with:
- **ReadOnlyAccess** (AWS managed policy)

For production, create custom policies with minimal required permissions.

### 2.4 Complete Role Creation

1. **Role name:** `auth0-sample-role` (or your preferred name)
2. **Description:** "Role for Auth0 federated access"
3. Click **"Create role"**

---

## Step 3: Understanding Trust Policy Components

### 3.1 Trust Policy Breakdown

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",                                    // Allow assumption
            "Principal": {
                "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/DOMAIN/"  // Who can assume
            },
            "Action": "sts:AssumeRoleWithWebIdentity",            // What action
            "Condition": {                                        // Security conditions
                "StringEquals": {
                    "DOMAIN/:aud": "CLIENT_ID",                   // Audience check
                    "DOMAIN/:email": "user@example.com"           // User restriction
                }
            }
        }
    ]
}
```

### 3.2 Security Conditions Explained

| Condition | Purpose | Example |
|-----------|---------|---------|
| `:aud` | Validates the token audience (client ID) | Ensures tokens are from your app |
| `:email` | Restricts to specific user email | Limits access to authorized users |
| `:email_verified` | Requires verified email | `"DOMAIN/:email_verified": "true"` |
| `:sub` | Restricts to specific user ID | More stable than email |

### 3.3 Advanced Security Conditions

For more flexible access control:

```json
"Condition": {
    "StringEquals": {
        "sleepydev.eu.auth0.com/:aud": "XCaSnYut7Tl4ubdR7pKzkjBym19JRoBl"
    },
    "ForAnyValue:StringLike": {
        "sleepydev.eu.auth0.com/:email": [
            "*@yourcompany.com",
            "contractor@example.com"
        ]
    },
    "Bool": {
        "sleepydev.eu.auth0.com/:email_verified": "true"
    }
}
```

---

## Step 4: Testing and Validation

### 4.1 Validate OIDC Provider

1. Go to **IAM** → **Identity providers**
2. Click on your provider (`sleepydev.eu.auth0.com/`)
3. Verify the **ARN** matches your trust policy
4. Check **Audiences** contains your client ID

### 4.2 Test Role Assumption

You can test the setup using AWS CLI:

```bash
aws sts assume-role-with-web-identity \
    --role-arn arn:aws:iam::846173919647:role/auth0-sample-role \
    --role-session-name test-session \
    --web-identity-token "YOUR_JWT_TOKEN_HERE"
```

### 4.3 Application Integration

Your application should:
1. Authenticate user with Auth0
2. Obtain JWT token from Auth0
3. Call AWS STS `AssumeRoleWithWebIdentity` with the JWT
4. Use returned temporary credentials for AWS access

---

## Step 5: Security Best Practices

### 5.1 Principle of Least Privilege

- ✅ **DO:** Start with minimal permissions and add as needed
- ❌ **DON'T:** Use overly broad policies like `AdministratorAccess`

### 5.2 Trust Policy Security

- ✅ **DO:** Always include audience (`:aud`) condition
- ✅ **DO:** Restrict by email, domain, or user ID when possible
- ✅ **DO:** Require email verification (`:email_verified`)
- ❌ **DON'T:** Use wildcard (*) conditions without careful consideration

### 5.3 Token Management

- ✅ **DO:** Use short-lived tokens (15 minutes - 1 hour)
- ✅ **DO:** Implement token refresh mechanisms
- ❌ **DON'T:** Store long-lived credentials in client applications

### 5.4 Monitoring and Auditing

- ✅ **DO:** Enable CloudTrail for `AssumeRoleWithWebIdentity` events
- ✅ **DO:** Monitor unusual access patterns
- ✅ **DO:** Set up alerts for failed assumption attempts

---

## Step 6: Troubleshooting Common Issues

### 6.1 "Invalid identity token" Error

**Possible Causes:**
- Token expired
- Wrong audience in token
- Mismatched client ID in conditions

**Solution:**
- Verify token is fresh and not expired
- Check audience claim in JWT matches trust policy condition
- Ensure client ID in Auth0 matches AWS configuration

### 6.2 "Access Denied" Error

**Possible Causes:**
- Email doesn't match condition
- Missing required claims in token
- User not verified in Auth0

**Solution:**
- Check email in JWT token matches trust policy
- Verify user email is verified in Auth0
- Review all StringEquals conditions

### 6.3 "Provider not found" Error

**Possible Causes:**
- OIDC provider not registered
- Wrong provider URL format
- Typo in federated ARN

**Solution:**
- Verify provider exists in IAM → Identity providers
- Check provider URL format (no trailing slash)
- Ensure federated ARN matches exactly

---

## Step 7: Production Considerations

### 7.1 Multiple Users/Groups

For multiple users, consider using group-based conditions:

```json
"Condition": {
    "StringEquals": {
        "sleepydev.eu.auth0.com/:aud": "XCaSnYut7Tl4ubdR7pKzkjBym19JRoBl"
    },
    "ForAnyValue:StringEquals": {
        "sleepydev.eu.auth0.com/:groups": ["aws-users", "developers"]
    }
}
```

### 7.2 Environment-Specific Roles
h 
Create separate roles for different environments:
- `auth0-dev-role` - Limited dev environment access
- `auth0-staging-role` - Staging environment access  
- `auth0-prod-role` - Production read-only access

### 7.3 Session Duration

Configure appropriate session durations:
- Development: 1-4 hours
- Production: 15 minutes - 1 hour
- Admin access: 15-30 minutes

---

## Example Configuration Summary

Based on the provided example:

| Component | Value |
|-----------|--------|
| **AWS Account ID** | `846173919647` |
| **Auth0 Domain** | `sleepydev.eu.auth0.com` |
| **Client ID** | `XCaSnYut7Tl4ubdR7pKzkjBym19JRoBl` |
| **Authorized Email** | `alessio.dimaria@gmail.com` |
| **Role Name** | `auth0-sample-role` |
| **Provider ARN** | `arn:aws:iam::846173919647:oidc-provider/sleepydev.eu.auth0.com/` |
| **Role ARN** | `arn:aws:iam::846173919647:role/auth0-sample-role` |

This configuration allows only the specified user to assume the role using tokens from the specific Auth0 application.

---

## Resources

- [AWS IAM OIDC Identity Providers Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [AWS STS AssumeRoleWithWebIdentity API](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html)
- [Auth0 Documentation](https://auth0.com/docs)
- [JWT Token Inspector](https://jwt.io/) - For debugging token claims