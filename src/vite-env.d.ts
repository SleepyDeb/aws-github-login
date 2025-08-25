/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OAUTH_AUTHORITY?: string;
  readonly VITE_OAUTH_CLIENT_ID?: string;
  readonly VITE_OAUTH_SCOPE?: string;
  readonly VITE_REDIRECT_URI?: string;
  readonly VITE_AWS_FEDERATION_ENDPOINT_PROXY?: string;
  readonly OAUTH_AUTHORITY?: string;
  readonly OAUTH_CLIENT_ID?: string;
  readonly OAUTH_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}