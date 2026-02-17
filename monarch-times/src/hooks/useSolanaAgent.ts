/**
 * useBaseAgent - Hook for Base blockchain agent interactions
 *
 * This hook manages agent data on Base (Ethereum L2).
 * Currently returns placeholder values - implement actual Base contract
 * interactions when smart contracts are deployed.
 */
export const useBaseAgent = () => {
    return {
        insights: [],
        setIsSyncingWithBase: () => {
            console.warn('Base blockchain sync not yet implemented');
        },
        setInsightBaseData: () => {
            console.warn('Base blockchain data not yet implemented');
        },
    }
}

// Legacy export for backward compatibility
export const useSolanaAgent = useBaseAgent;