import React from 'react';
import Avatar from 'boring-avatars';

interface AgentAvatarProps {
  /** Public key or unique identifier for the agent */
  identifier: string;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Avatar variant style */
  variant?: 'marble' | 'beam' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';
  /** Additional CSS classes */
  className?: string;
}

// De Stijl inspired color palette (Mondrian colors)
const MONARCH_COLORS = ['#FF0000', '#0052FF', '#FFD700', '#000000', '#FFFFFF'];

const AgentAvatar: React.FC<AgentAvatarProps> = ({
  identifier,
  size = 48,
  variant = 'bauhaus',
  className = '',
}) => {
  return (
    <div className={`inline-block ${className}`}>
      <Avatar
        name={identifier}
        size={size}
        variant={variant}
        colors={MONARCH_COLORS}
      />
    </div>
  );
};

export default AgentAvatar;
