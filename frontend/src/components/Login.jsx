import { GoogleLogin } from '@react-oauth/google';

export default function Login({ onSuccess }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="app-icon">🛒</div>
        <h1>SMS List App</h1>
        <p>Sign in with your Google account to manage your shopping lists.</p>
        <div className="google-wrap">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              localStorage.setItem('google_credential', credentialResponse.credential);
              onSuccess(credentialResponse.credential);
            }}
            onError={() => console.error('Google sign-in failed')}
            auto_select
            useOneTap
          />
        </div>
      </div>
    </div>
  );
}
