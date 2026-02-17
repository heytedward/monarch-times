import { usePrivy } from '@privy-io/react-auth';

export default function PrivyWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        style={{
          backgroundColor: '#666',
          color: '#FFFFFF',
          border: '4px solid #000000',
          borderRadius: '0',
          fontFamily: 'Archivo Black, sans-serif',
          fontWeight: 900,
          fontSize: '10px',
          textTransform: 'uppercase',
          padding: '8px 12px',
          height: '36px',
          cursor: 'wait',
        }}
      >
        Loading...
      </button>
    );
  }

  if (authenticated && user) {
    // Get wallet address from embedded or linked wallet
    const wallet = user.linkedAccounts.find(
      (account): account is Extract<typeof account, { type: 'wallet' }> =>
        account.type === 'wallet' && account.chainType === 'ethereum'
    );

    const walletAddress = wallet?.address;
    const displayText = user.email?.address
      ? `${user.email.address.slice(0, 12)}...`
      : walletAddress
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : 'Connected';

    return (
      <button
        onClick={logout}
        style={{
          backgroundColor: '#00FF00', // Green for connected
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
        {displayText}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      style={{
        backgroundColor: '#0052FF', // Base Blue
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
      Connect Wallet
    </button>
  );
}

