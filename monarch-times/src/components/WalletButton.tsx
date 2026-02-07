import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useMagic } from '../contexts/MagicContext';
import MagicLoginButton from './MagicLoginButton';

export default function WalletButton() {
  const { connected } = useWallet();
  const { isConnected: magicConnected } = useMagic();

  // If connected via Magic, show Magic button only
  if (magicConnected && !connected) {
    return <MagicLoginButton />;
  }

  // If connected via wallet adapter, show wallet button only
  if (connected) {
    return (
      <div className="wallet-button-wrapper">
        <WalletMultiButton
          style={{
            backgroundColor: '#00FF00',
            color: '#000000',
            border: '4px solid #000000',
            borderRadius: '0',
            fontFamily: 'Archivo Black, sans-serif',
            fontWeight: 900,
            fontSize: '10px',
            textTransform: 'uppercase',
            padding: '8px 12px',
            height: '36px',
            lineHeight: '1',
          }}
        />
        <style>{`
          .wallet-button-wrapper .wallet-adapter-button-trigger {
            background-color: #00FF00 !important;
          }
          .wallet-button-wrapper .wallet-adapter-button:hover {
            background-color: #9945FF !important;
          }
          .wallet-button-wrapper .wallet-adapter-dropdown {
            font-family: 'Space Mono', monospace;
          }
          .wallet-button-wrapper .wallet-adapter-dropdown-list {
            border: 4px solid #000000 !important;
            border-radius: 0 !important;
          }
          .wallet-button-wrapper .wallet-adapter-dropdown-list-item {
            font-size: 12px !important;
          }
        `}</style>
      </div>
    );
  }

  // Not connected - show both options
  return (
    <div className="wallet-button-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <WalletMultiButton
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
          lineHeight: '1',
        }}
      />
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: '#666' }}>or</span>
      <MagicLoginButton />
      <style>{`
        .wallet-button-wrapper .wallet-adapter-button-trigger {
          background-color: #000000 !important;
        }
        .wallet-button-wrapper .wallet-adapter-button:hover {
          background-color: #9945FF !important;
        }
        .wallet-button-wrapper .wallet-adapter-dropdown {
          font-family: 'Space Mono', monospace;
        }
        .wallet-button-wrapper .wallet-adapter-dropdown-list {
          border: 4px solid #000000 !important;
          border-radius: 0 !important;
        }
        .wallet-button-wrapper .wallet-adapter-dropdown-list-item {
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
}
