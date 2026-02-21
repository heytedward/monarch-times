/**
 * useSolanaPay - Hook for Solana payment transactions
 *
 * This hook handles payment creation and verification on Solana.
 * Currently returns placeholder.
 */
export function useSolanaPay() {
    return {
        createTransaction: async () => {
            console.warn('Solana payment transactions not yet implemented');
            throw new Error('Payment feature coming soon on Solana');
        },
    }
}

// Legacy export (now correctly points to the true hook)
export const useBasePay = useSolanaPay;