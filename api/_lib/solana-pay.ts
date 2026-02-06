import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import BigNumber from 'bignumber.js';

// USDC Mint Addresses
export const USDC_MINT = {
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
};

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

// Get the active network
export const getNetwork = () => {
  return (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet';
};

// Get USDC mint for current network
export const getUsdcMint = () => {
  return USDC_MINT[getNetwork()];
};

// Get RPC endpoint
export const getRpcEndpoint = () => {
  const network = getNetwork();
  if (network === 'mainnet') {
    return process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com';
  }
  return process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
};

// Platform treasury wallet
export const getPlatformTreasury = () => {
  const treasury = process.env.PLATFORM_TREASURY_WALLET;
  if (!treasury) {
    throw new Error('PLATFORM_TREASURY_WALLET environment variable not set');
  }
  return new PublicKey(treasury);
};

// Payment split percentages
export const PAYMENT_SPLITS = {
  tip: { agent: 0.85, platform: 0.15 },
  topicUnlock: { agent: 0, platform: 1.0 },
  mintFee: { agent: 0.90, platform: 0.10 },
  subscription: { agent: 0, platform: 1.0 },
};

// Payment amounts in USDC
export const PAYMENT_AMOUNTS = {
  tip: 0.25,
  topicUnlock: {
    second: 0.10,
    thirdPlus: 0.25,
  },
  subscription: 5.00,
};

// Convert USDC amount to token amount (with 6 decimals)
export const usdcToTokenAmount = (usdc: number): bigint => {
  return BigInt(new BigNumber(usdc).times(10 ** USDC_DECIMALS).integerValue().toString());
};

// Generate a unique reference key for tracking payments
export const generateReference = (): PublicKey => {
  return Keypair.generate().publicKey;
};

// Get or create associated token account
async function getOrCreateATA(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  transaction: Transaction
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(mint, owner, true);

  try {
    await getAccount(connection, ata);
  } catch {
    // Account doesn't exist, add instruction to create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        ata,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  return ata;
}

export interface SplitPaymentParams {
  payerWallet: string;
  agentWallet?: string; // Optional - for tips and mint fees
  amount: number; // Total amount in USDC
  splitType: keyof typeof PAYMENT_SPLITS;
  reference: PublicKey;
}

export interface SplitPaymentResult {
  transaction: string; // Base64 encoded transaction
  reference: string;
  amount: number;
  agentShare: number;
  platformShare: number;
}

/**
 * Creates a split payment transaction where funds go to both agent and platform
 */
export async function createSplitPaymentTransaction(
  params: SplitPaymentParams
): Promise<SplitPaymentResult> {
  const { payerWallet, agentWallet, amount, splitType, reference } = params;

  const connection = new Connection(getRpcEndpoint(), 'confirmed');
  const usdcMint = getUsdcMint();
  const platformTreasury = getPlatformTreasury();
  const splits = PAYMENT_SPLITS[splitType];

  const payer = new PublicKey(payerWallet);
  const totalTokens = usdcToTokenAmount(amount);

  // Calculate splits
  const agentShare = amount * splits.agent;
  const platformShare = amount * splits.platform;
  const agentTokens = usdcToTokenAmount(agentShare);
  const platformTokens = usdcToTokenAmount(platformShare);

  // Create transaction
  const transaction = new Transaction();

  // Get payer's USDC account
  const payerATA = await getAssociatedTokenAddress(usdcMint, payer);

  // Add reference for tracking (as a memo-like instruction)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: payer,
      lamports: 0,
    })
  );

  // Transfer to agent (if applicable)
  if (agentWallet && agentTokens > 0n) {
    const agent = new PublicKey(agentWallet);
    const agentATA = await getOrCreateATA(connection, payer, usdcMint, agent, transaction);

    transaction.add(
      createTransferCheckedInstruction(
        payerATA,
        usdcMint,
        agentATA,
        payer,
        agentTokens,
        USDC_DECIMALS
      )
    );
  }

  // Transfer to platform treasury
  if (platformTokens > 0n) {
    const treasuryATA = await getOrCreateATA(connection, payer, usdcMint, platformTreasury, transaction);

    transaction.add(
      createTransferCheckedInstruction(
        payerATA,
        usdcMint,
        treasuryATA,
        payer,
        platformTokens,
        USDC_DECIMALS
      )
    );
  }

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  // Serialize transaction (unsigned - client will sign)
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    reference: reference.toBase58(),
    amount,
    agentShare,
    platformShare,
  };
}

/**
 * Verifies a payment was completed on-chain
 */
export async function verifyPayment(signature: string): Promise<{
  confirmed: boolean;
  slot?: number;
  blockTime?: number | null;
  error?: string;
}> {
  try {
    const connection = new Connection(getRpcEndpoint(), 'confirmed');

    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (!status.value) {
      return { confirmed: false, error: 'Transaction not found' };
    }

    if (status.value.err) {
      return { confirmed: false, error: `Transaction failed: ${JSON.stringify(status.value.err)}` };
    }

    const confirmed = status.value.confirmationStatus === 'confirmed' ||
                     status.value.confirmationStatus === 'finalized';

    return {
      confirmed,
      slot: status.value.slot,
    };
  } catch (error: any) {
    return { confirmed: false, error: error.message };
  }
}

/**
 * Get transaction details including token transfers
 */
export async function getTransactionDetails(signature: string) {
  const connection = new Connection(getRpcEndpoint(), 'confirmed');

  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  return tx;
}
