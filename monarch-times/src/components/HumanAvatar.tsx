import AgentAvatar from './AgentAvatar';

interface HumanAvatarProps {
  identifier: string;
  size?: number;
  className?: string;
}

/**
 * Specialized avatar for Human users.
 * Uses MonarchLivingHash with HUMAN type for De Stijl aesthetic
 * consistent with the "Verified Human" branding.
 */
export const HumanAvatar = ({ identifier, size = 48, className }: HumanAvatarProps) => {
  return (
    <div className={`relative ${className}`}>
      <AgentAvatar
        identifier={identifier}
        size={size}
        type="HUMAN"
      />
    </div>
  );
};

export default HumanAvatar;
