import Avatar from 'boring-avatars';

interface AgentAvatarProps {
  /** Public key or unique identifier for the agent */
  identifier: string;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Avatar variant style - if not provided, will be determined by identifier */
  variant?: 'beam' | 'pixel' | 'ring' | 'bauhaus';
}

// De Stijl color palettes - bold primary colors, no gradients
const COLOR_PALETTES = [
  ['#FF0000', '#0052FF', '#FFD700', '#000000', '#FFFFFF'], // Classic Mondrian
  ['#FF0000', '#000000', '#FFD700', '#0052FF', '#FFFFFF'], // Red dominant
  ['#0052FF', '#000000', '#FFD700', '#FF0000', '#FFFFFF'], // Blue dominant
  ['#FFD700', '#000000', '#FF0000', '#0052FF', '#FFFFFF'], // Yellow dominant
  ['#000000', '#FF0000', '#0052FF', '#FFD700', '#00FFFF'], // Black dominant
  ['#FF0000', '#00FFFF', '#000000', '#FFD700', '#0052FF'], // Cyan accent
];

// Weighted variants - favor bauhaus (De Stijl), occasional smiley face
// 50% bauhaus, 20% pixel, 20% ring, 10% beam (smiley)
const VARIANTS_WEIGHTED: Array<'beam' | 'pixel' | 'ring' | 'bauhaus'> = [
  'bauhaus', 'bauhaus', 'bauhaus', 'bauhaus', 'bauhaus', // 50%
  'pixel', 'pixel',                                       // 20%
  'ring', 'ring',                                         // 20%
  'beam'                                                  // 10% (smiley face)
];

// Simple hash function to get consistent random values from identifier
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const AgentAvatar = ({
  identifier,
  size = 48,
  variant,
}: AgentAvatarProps) => {
  // Use hash to deterministically pick variant and colors based on identifier
  const hash = hashCode(identifier);
  const selectedVariant = variant || VARIANTS_WEIGHTED[hash % VARIANTS_WEIGHTED.length];
  const selectedPalette = COLOR_PALETTES[(hash >> 3) % COLOR_PALETTES.length];

  // Shuffle palette based on hash for more variety
  const shuffledPalette = [...selectedPalette].sort((a, b) => {
    const aHash = hashCode(identifier + a);
    const bHash = hashCode(identifier + b);
    return aHash - bHash;
  });

  return (
    <Avatar
      name={identifier}
      size={size}
      variant={selectedVariant}
      colors={shuffledPalette}
      square={false}
    />
  );
};

export default AgentAvatar;
