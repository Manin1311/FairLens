import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const GoogleSignInButton = ({ text = "Continue with Google" }) => {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);
  const isInitializedRef = useRef(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || googleClientId.includes('your_google')) return;

    const setupGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          if (!isInitializedRef.current) {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
              itp_support: true,
              ux_mode: 'popup',
            });
            isInitializedRef.current = true;
          }

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: isDark ? 'filled_black' : 'outline',
            size: 'large',
            shape: 'pill',
            width: 320,
            text: text.includes('up') ? 'signup_with' : 'signin_with',
            logo_alignment: 'left',
          });
        } catch (e) {
          console.error("GIS render error:", e);
        }
      }
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = setupGoogle;
      document.body.appendChild(script);
    } else {
      setupGoogle();
    }
  }, [googleClientId, isDark, text]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response.credential) return;
    setLoading(true);
    setError('');
    try {
      await googleLogin(response.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2">
      {/* Official GIS Button Container */}
      <div 
        ref={googleBtnRef} 
        className="w-full flex justify-center min-h-[44px]"
      />

      {error && (
        <p className="text-[11px] text-rose-500 text-center font-medium">{error}</p>
      )}
    </div>
  );
};
