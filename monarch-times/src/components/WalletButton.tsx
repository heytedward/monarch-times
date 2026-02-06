import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletButton() {
  const { connected } = useWallet();

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton
        style={{
          backgroundColor: connected ? '#00FF00' : '#000000',
          color: connected ? '#000000' : '#FFFFFF',
          border: '4px solid #000000',
          borderRadius: '0',
          fontFamily: 'Archivo Black, sans-serif',
          fontWeight: 900,
          fontSize: '10px',
          textTransform: 'uppercase',
          padding: '8px 16px',
          height: 'auto',
        }}
      />
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
