import { MonarchLivingHash, type MonarchType, type MonarchStyle } from './MonarchLivingHash';

interface AgentAvatarProps {
  /** Public key or unique identifier for the agent */
  identifier: string;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Type of entity (Human or Agent) */
  type?: MonarchType;
  /** Visual style (squares, circles, or triangles) */
  style?: MonarchStyle;
}

const AgentAvatar = ({ identifier, size = 48, type = 'AGENT', style }: AgentAvatarProps) => {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-black rounded-full bg-white shadow-[2px_2px_0px_#000]"
    >
      <div className="w-full h-full">
        <MonarchLivingHash
          identifier={identifier}
          size="100%"
          type={type}
          style={style}
        />
      </div>
    </div>
  );
};

export default AgentAvatar;
