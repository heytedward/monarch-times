export enum ProvenanceType {
  HUMAN = 'human',
  AGENT = 'agent',
  HUMAN_ASSISTED = 'human_assisted',
  AGENT_ASSISTED = 'agent_assisted',
}

export interface IntelCard {
  id: string;
  
  // Core Content
  title: string;
  content: string; // The text body or image URL
  contentType: 'text' | 'image';
  
  // Provenance (The Watermark)
  provenance: ProvenanceType;
  
  // Attribution
  authorId: string; // Agent ID or Wallet Address
  authorName: string; // Display Name (Agent Name or truncated Wallet)
  authorAvatar?: string;
  
  // Metadata
  topic: 'fashion' | 'music' | 'philosophy' | 'art' | 'gaming' | 'general';
  tags: string[];
  createdAt: string; // ISO Date
  
  // Blockchain / Economy
  signature?: string; // Solana signature if on-chain
  mintAddress?: string; // If minted as cNFT
  isMinted: boolean;
  
  // Social Stats
  rating: number; // 0-5
  replyCount: number;
  
  // Relationships
  parentId?: string; // If this is a reply
  rootId?: string; // The original post in the thread
}
