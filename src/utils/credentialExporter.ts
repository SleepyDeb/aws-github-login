export const EXPORT_FORMATS = [
  {
    format: 'bash',
    label: 'Bash/Shell',
    description: 'Export commands for Bash or similar shells'
  },
  {
    format: 'cmd',
    label: 'Windows CMD',
    description: 'Set commands for Windows Command Prompt'
  },
  {
    format: 'powershell',
    label: 'PowerShell',
    description: 'Set commands for PowerShell'
  }
];

export function formatCredentialsForBash(credentials: { AccessKeyId: string; SecretAccessKey: string; SessionToken: string }): string {
  return `export AWS_ACCESS_KEY_ID="${credentials.AccessKeyId}"
export AWS_SECRET_ACCESS_KEY="${credentials.SecretAccessKey}"
export AWS_SESSION_TOKEN="${credentials.SessionToken}"`;
}

export function formatCredentialsForCmd(credentials: { AccessKeyId: string; SecretAccessKey: string; SessionToken: string }): string {
  return `set AWS_ACCESS_KEY_ID=${credentials.AccessKeyId}
set AWS_SECRET_ACCESS_KEY=${credentials.SecretAccessKey}
set AWS_SESSION_TOKEN=${credentials.SessionToken}`;
}

export function formatCredentialsForPowershell(credentials: { AccessKeyId: string; SecretAccessKey: string; SessionToken: string }): string {
  return `$env:AWS_ACCESS_KEY_ID="${credentials.AccessKeyId}"
$env:AWS_SECRET_ACCESS_KEY="${credentials.SecretAccessKey}"
$env:AWS_SESSION_TOKEN="${credentials.SessionToken}"`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}