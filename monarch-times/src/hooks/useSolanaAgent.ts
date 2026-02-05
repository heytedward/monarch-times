import { useAgentStore } from '../store/agentStore';

export const useSolanaAgent = () => {
  const { insights, setIsSyncingWithSolana, setInsightSolanaData } = useAgentStore();

  const populateSlotFromChain = async (slotIndex: number, signature: string) => {
    setIsSyncingWithSolana(true);

    // Simulate Helius/Solana RPC and SolAuth interaction
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate network delay

    const insightToUpdate = insights[slotIndex];

    if (insightToUpdate && insightToUpdate.title !== 'Empty Slot') {
      const mockLeafIndex = Math.floor(Math.random() * 1000000);
      const mockTreeAddress = `0x${Math.random().toString(16).substr(2, 64)}`; // Mock address
      const mockSignature = `0x${Math.random().toString(16).substr(2, 64)}`; // Mock signature

      // Simulate notarization by SolAuth
      const mockIsSolAuthVerified = Math.random() > 0.3; // 70% chance to be verified

      setInsightSolanaData(insightToUpdate.id, {
        leafIndex: mockLeafIndex,
        treeAddress: mockTreeAddress,
        signature: mockSignature,
        isSolAuthVerified: mockIsSolAuthVerified,
      });
    }

    setIsSyncingWithSolana(false);
  };

  return {
    populateSlotFromChain,
  };
};
