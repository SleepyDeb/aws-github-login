import React from 'react';
import './App.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth, useUserProfile } from './hooks/useAuth.js';
import LoginButton from './components/LoginButton.jsx';
import LogoutButton from './components/LogoutButton.jsx';
import OpenConsoleButton, { DebugConsoleButton } from './components/OpenConsoleButton.jsx';

/**
 * User Info Component
 * Displays authenticated user information
 */
function UserInfo() {
  const { user, getDebugInfo } = useAuth();
  const userProfile = useUserProfile();
  
  if (!user) return null;

  const debugInfo = getDebugInfo();
  const timeRemaining = debugInfo.debugInfo?.timeRemainingFormatted || 'Unknown';

  return (
    <div style={{
      backgroundColor: '#f6f8fa',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      padding: '16px',
      margin: '20px 0',
      maxWidth: '600px'
    }}>
      <h2 style={{ margin: '0 0 16px 0', color: '#24292e' }}>
        Welcome, {userProfile?.name || 'User'}! 👋
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
        {userProfile?.email && (
          <div><strong>Email:</strong> {userProfile.email}</div>
        )}
        {userProfile?.id && (
          <div><strong>User ID:</strong> {userProfile.id}</div>
        )}
        <div><strong>Session Expires:</strong> {timeRemaining}</div>
        <div><strong>Authenticated:</strong> ✅ Yes</div>
      </div>

      {userProfile?.picture && (
        <div style={{ marginTop: '12px' }}>
          <img 
            src={userProfile.picture} 
            alt="User Avatar" 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%',
              border: '2px solid #e1e4e8'
            }} 
          />
        </div>
      )}
    </div>
  );
}

/**
 * Error Display Component
 * Shows authentication errors with retry option
 */
function ErrorDisplay() {
  const { error, clearError } = useAuth();
  
  if (!error) return null;

  return (
    <div style={{
      backgroundColor: '#ffeef0',
      border: '1px solid #f97583',
      borderRadius: '6px',
      padding: '16px',
      margin: '20px 0',
      color: '#d73a49'
    }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Authentication Error</h3>
      <p style={{ margin: '0 0 12px 0' }}>{error}</p>
      <button
        onClick={clearError}
        style={{
          backgroundColor: '#d73a49',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px'
    }}>
      <div style={{
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #0366d6',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Authentication Buttons Component
 * Shows appropriate buttons based on auth state
 */
function AuthButtons() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
      {!isAuthenticated ? (
        <LoginButton text="Sign In with OAuth" />
      ) : (
        <>
          <OpenConsoleButton />
          <LogoutButton confirmLogout={true} />
          {process.env.NODE_ENV === 'development' && <DebugConsoleButton />}
        </>
      )}
    </div>
  );
}

/**
 * Main App Content Component
 * Contains the main application UI
 */
function AppContent() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  // Show loading spinner while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="App">
        <header className="App-header">
          <img src="Octocat.png" className="App-logo" alt="logo" />
          <h1>OAuth2 PKCE Authentication</h1>
          <LoadingSpinner />
          <p>Initializing authentication...</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src="Octocat.png" className="App-logo" alt="logo" />
        
        <h1>
          OAuth2 PKCE Authentication
          <span className="heart" style={{ marginLeft: '8px' }}>🔐</span>
        </h1>

        <ErrorDisplay />

        {isAuthenticated ? (
          <>
            <UserInfo />
            <p className="small">
              You are successfully authenticated! 🎉
            </p>
          </>
        ) : (
          <>
            <p>
              This application demonstrates OAuth2 authentication with PKCE support.
            </p>
            <p className="small">
              Click the button below to sign in with your OAuth provider.
            </p>
          </>
        )}

        <AuthButtons />

        {/* Configuration Info */}
        <div style={{ 
          marginTop: '40px', 
          padding: '16px', 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          borderRadius: '6px',
          fontSize: '12px',
          maxWidth: '600px'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Configuration</h3>
          <div style={{ textAlign: 'left' }}>
            <div><strong>Authority:</strong> {import.meta.env.VITE_OAUTH_AUTHORITY || import.meta.env.OAUTH_AUTHORITY || 'Not configured'}</div>
            <div><strong>Client ID:</strong> {import.meta.env.VITE_OAUTH_CLIENT_ID || import.meta.env.OAUTH_CLIENT_ID || 'Not configured'}</div>
            <div><strong>Scope:</strong> {import.meta.env.VITE_OAUTH_SCOPE || import.meta.env.OAUTH_SCOPE || 'Not configured'}</div>
            <div><strong>Redirect URI:</strong> {window.location.origin}</div>
          </div>
        </div>

        {/* Documentation Links */}
        <div style={{ marginTop: '20px' }}>
          <p className="small">
            Learn more about{' '}
            <a
              className="App-link"
              href="https://tools.ietf.org/html/rfc6749"
              target="_blank"
              rel="noopener noreferrer"
            >
              OAuth2
            </a>
            {' '}and{' '}
            <a
              className="App-link"
              href="https://tools.ietf.org/html/rfc7636"
              target="_blank"
              rel="noopener noreferrer"
            >
              PKCE
            </a>
          </p>
        </div>
      </header>
    </div>
  );
}

/**
 * Main App Component
 * Wraps the application with AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
