/**
 * Magic Login Button Component
 *
 * Email-based login alternative to wallet connection.
 * Shows email input modal and handles wallet provisioning.
 */

import { useState } from 'react';
import { useMagic } from '../contexts/MagicContext';

interface MagicLoginButtonProps {
  onSuccess?: (walletAddress: string) => void;
}

export default function MagicLoginButton({ onSuccess }: MagicLoginButtonProps) {
  const { isConnected, email, walletAddress, isLoading, error, login, logout } = useMagic();
  const [showModal, setShowModal] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!inputEmail.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    try {
      await login(inputEmail.trim());
      setShowModal(false);
      setInputEmail('');
      if (onSuccess && walletAddress) {
        onSuccess(walletAddress);
      }
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  if (isConnected) {
    return (
      <div className="magic-login-connected">
        <button
          onClick={logout}
          style={{
            backgroundColor: '#00FFFF',
            color: '#000000',
            border: '4px solid #000000',
            borderRadius: '0',
            fontFamily: 'Archivo Black, sans-serif',
            fontWeight: 900,
            fontSize: '10px',
            textTransform: 'uppercase',
            padding: '8px 12px',
            height: '36px',
            cursor: 'pointer',
          }}
        >
          {email?.slice(0, 12)}... | {walletAddress?.slice(0, 4)}...
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          border: '4px solid #000000',
          borderRadius: '0',
          fontFamily: 'Archivo Black, sans-serif',
          fontWeight: 900,
          fontSize: '10px',
          textTransform: 'uppercase',
          padding: '8px 12px',
          height: '36px',
          cursor: 'pointer',
        }}
      >
        Login with Email
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '6px solid #000000',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: 'Archivo Black, sans-serif',
                fontSize: '18px',
                marginBottom: '16px',
                textTransform: 'uppercase',
              }}
            >
              Login with Email
            </h3>
            <p
              style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '12px',
                marginBottom: '24px',
                color: '#666',
              }}
            >
              Enter your email to receive a Solana wallet. No extensions or seed phrases required.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '4px solid #000000',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '14px',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                }}
                disabled={isLoading}
              />

              {(localError || error) && (
                <p
                  style={{
                    color: '#FF0000',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '12px',
                    marginBottom: '16px',
                  }}
                >
                  {localError || error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    backgroundColor: isLoading ? '#999' : '#000000',
                    color: '#FFFFFF',
                    border: '4px solid #000000',
                    padding: '12px',
                    fontFamily: 'Archivo Black, sans-serif',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: isLoading ? 'wait' : 'pointer',
                  }}
                >
                  {isLoading ? 'Creating Wallet...' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: '4px solid #000000',
                    padding: '12px',
                    fontFamily: 'Archivo Black, sans-serif',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
