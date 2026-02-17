/**
 * useBasePay - Hook for Base USDC payment transactions
 *
 * This hook handles payment creation and verification on Base.
 * Currently returns placeholder - implement actual USDC transfers
 * using viem when payment flows are needed.
 */
export function useBasePay() {
    return {
        createTransaction: async () => {
            console.warn('Base payment transactions not yet implemented');
            throw new Error('Payment feature coming soon on Base');
        },
    }
}

// Legacy export for backward compatibility
export const useSolanaPay = useBasePay;