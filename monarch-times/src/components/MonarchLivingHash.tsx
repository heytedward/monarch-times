import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// Types
export type MonarchType = 'HUMAN' | 'AGENT';
export type MonarchStyle = 'squares' | 'triangles';

interface MonarchLivingHashProps {
  identifier: string;
  size?: number | string;
  type?: MonarchType;
  style?: MonarchStyle;
  className?: string;
}

// Configuration - Pure Mondrian palette (no white/gray)
const COLORS = ['#FF0000', '#0052FF', '#FFD700', '#00FFFF', '#9945FF'];
const STROKE_WIDTH = 3; // Bolder lines for De Stijl aesthetic

// Pupil configuration
const PUPIL_SIZE = 4;
const PUPIL_MOVEMENT_RANGE = 3; // pixels of movement in each direction

// Deterministic Random Number Generator (SplitMix32)
const createRNG = (seedStr: string) => {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed + seedStr.charCodeAt(i)) | 0;
  }
  return () => {
    seed |= 0;
    seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
};

export const MonarchLivingHash = ({ identifier, size = '100%', type = 'AGENT', style, className = '' }: MonarchLivingHashProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Deterministically choose style based on identifier if not provided
  const avatarStyle = useMemo(() => {
    if (style) return style;
    const rng = createRNG(identifier + '_style');
    const styleValue = rng();
    return styleValue < 0.5 ? 'squares' : 'triangles';
  }, [identifier, style]);

  // Cursor tracking for pupil movement
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  // Smooth spring animation for pupils
  const pupilX = useSpring(cursorX, { stiffness: 150, damping: 15 });
  const pupilY = useSpring(cursorY, { stiffness: 150, damping: 15 });

  // Memoize background shapes based on style
  const backgroundShapes = useMemo(() => {
    const rng = createRNG(identifier);
    const MIN_SPACING = 20; // Minimum distance between grid lines

    // Helper function to generate well-spaced split points
    const generateSplitPoints = (count: number, min: number, max: number, existing: number[]): number[] => {
      const points: number[] = [];
      const maxAttempts = 50;

      for (let i = 0; i < count; i++) {
        let attempts = 0;
        let newPoint: number;
        let isValid: boolean;

        do {
          newPoint = Math.floor(rng() * (max - min)) + min;
          isValid = true;

          // Check distance from all existing points
          for (const existingPoint of [...existing, ...points]) {
            if (Math.abs(newPoint - existingPoint) < MIN_SPACING) {
              isValid = false;
              break;
            }
          }

          attempts++;
        } while (!isValid && attempts < maxAttempts);

        if (isValid) {
          points.push(newPoint);
        }
      }

      return points;
    };

    if (avatarStyle === 'squares') {
      // De Stijl Mondrian rectangles
      const blocks: { x: number, y: number, w: number, h: number, color: string }[] = [];
      const splitPointsX = [0, 100];
      const splitPointsY = [0, 100];
      const splitCount = 3 + Math.floor(rng() * 3);

      // Generate well-spaced splits
      splitPointsX.push(...generateSplitPoints(splitCount, 5, 95, [0, 100]));
      splitPointsY.push(...generateSplitPoints(splitCount, 5, 95, [0, 100]));

      const uniqueX = [...new Set(splitPointsX.sort((a, b) => a - b))];
      const uniqueY = [...new Set(splitPointsY.sort((a, b) => a - b))];

      for (let i = 0; i < uniqueX.length - 1; i++) {
        for (let j = 0; j < uniqueY.length - 1; j++) {
          const x = uniqueX[i];
          const y = uniqueY[j];
          const w = uniqueX[i+1] - x;
          const h = uniqueY[j+1] - y;

          const blockCenterX = x + w / 2;
          const blockCenterY = y + h / 2;
          const isMouthZone = blockCenterY > 55 && blockCenterY < 75 && blockCenterX > 35 && blockCenterX < 65;

          if (!isMouthZone) {
            blocks.push({ x, y, w, h, color: COLORS[Math.floor(rng() * COLORS.length)] });
          }
        }
      }
      return { type: 'squares' as const, shapes: blocks };

    } else {
      // Triangular mosaic composition - grid-based with shared vertices
      const triangles: { points: string, color: string }[] = [];

      // Create a grid of points - fewer splits for cleaner look
      const splitPointsX = [0, 100];
      const splitPointsY = [0, 100];
      const splitCount = 2 + Math.floor(rng() * 2); // 2-3 splits

      // Generate well-spaced splits
      splitPointsX.push(...generateSplitPoints(splitCount, 5, 95, [0, 100]));
      splitPointsY.push(...generateSplitPoints(splitCount, 5, 95, [0, 100]));

      const uniqueX = [...new Set(splitPointsX.sort((a, b) => a - b))];
      const uniqueY = [...new Set(splitPointsY.sort((a, b) => a - b))];

      // Create triangles by subdividing each grid rectangle
      for (let i = 0; i < uniqueX.length - 1; i++) {
        for (let j = 0; j < uniqueY.length - 1; j++) {
          const x1 = uniqueX[i];
          const y1 = uniqueY[j];
          const x2 = uniqueX[i + 1];
          const y2 = uniqueY[j + 1];

          const centerX = (x1 + x2) / 2;
          const centerY = (y1 + y2) / 2;
          const isMouthZone = centerY > 55 && centerY < 75 && centerX > 35 && centerX < 65;

          if (!isMouthZone) {
            // Simplified to just two diagonal patterns for cleaner look
            const pattern = Math.floor(rng() * 2);

            if (pattern === 0) {
              // Diagonal from top-left to bottom-right
              triangles.push({
                points: `${x1},${y1} ${x2},${y1} ${x2},${y2}`,
                color: COLORS[Math.floor(rng() * COLORS.length)]
              });
              triangles.push({
                points: `${x1},${y1} ${x2},${y2} ${x1},${y2}`,
                color: COLORS[Math.floor(rng() * COLORS.length)]
              });
            } else {
              // Diagonal from top-right to bottom-left
              triangles.push({
                points: `${x1},${y1} ${x2},${y1} ${x1},${y2}`,
                color: COLORS[Math.floor(rng() * COLORS.length)]
              });
              triangles.push({
                points: `${x2},${y1} ${x2},${y2} ${x1},${y2}`,
                color: COLORS[Math.floor(rng() * COLORS.length)]
              });
            }
          }
        }
      }
      return { type: 'triangles' as const, shapes: triangles };
    }
  }, [identifier, avatarStyle]);

  // Fixed, centered facial features
  const features = {
    leftEye: { x: 20, y: 35, w: 12, h: 12 },
    rightEye: { x: 68, y: 35, w: 12, h: 12 }
  };

  // Calculate pupil center positions (centered within each eye)
  const pupils = useMemo(() => ({
    left: {
      centerX: features.leftEye.x + features.leftEye.w / 2,
      centerY: features.leftEye.y + features.leftEye.h / 2
    },
    right: {
      centerX: features.rightEye.x + features.rightEye.w / 2,
      centerY: features.rightEye.y + features.rightEye.h / 2
    }
  }), []);

  // Track cursor position and calculate pupil offset
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate angle and distance from avatar center to cursor
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = Math.min(rect.width, rect.height) * 0.5;

      // Normalize to pupil movement range
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      const angle = Math.atan2(deltaY, deltaX);

      // Calculate pupil offset (clamped to movement range)
      const offsetX = Math.cos(angle) * normalizedDistance * PUPIL_MOVEMENT_RANGE;
      const offsetY = Math.sin(angle) * normalizedDistance * PUPIL_MOVEMENT_RANGE;

      cursorX.set(offsetX);
      cursorY.set(offsetY);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      // Return to center when mouse leaves
      cursorX.set(0);
      cursorY.set(0);
    };

    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [cursorX, cursorY]);

  // Synchronized blink timing (same for both eyes)
  const blinkDelay = useMemo(() => 2 + Math.random() * 3, [identifier]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`relative overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Background Shapes - Squares or Triangles */}
        {backgroundShapes.type === 'squares' && backgroundShapes.shapes.map((block, i) => (
          <rect
            key={i}
            x={block.x}
            y={block.y}
            width={block.w}
            height={block.h}
            fill={block.color}
            stroke="black"
            strokeWidth={STROKE_WIDTH}
          />
        ))}

        {backgroundShapes.type === 'triangles' && backgroundShapes.shapes.map((triangle, i) => (
          <polygon
            key={i}
            points={triangle.points}
            fill={triangle.color}
            stroke="black"
            strokeWidth={STROKE_WIDTH}
            strokeLinejoin="miter"
          />
        ))}

        {/* Left Eye (Blinking - Synchronized) */}
        <motion.rect
          x={features.leftEye.x}
          y={features.leftEye.y}
          width={features.leftEye.w}
          height={features.leftEye.h}
          fill="#FFFFFF"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{
            duration: 0.15,
            repeat: Infinity,
            repeatDelay: blinkDelay,
            ease: "easeInOut"
          }}
          style={{ originY: 0.5 }}
        />

        {/* Right Eye (Blinking - Synchronized) */}
        <motion.rect
          x={features.rightEye.x}
          y={features.rightEye.y}
          width={features.rightEye.w}
          height={features.rightEye.h}
          fill="#FFFFFF"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{
            duration: 0.15,
            repeat: Infinity,
            repeatDelay: blinkDelay,
            ease: "easeInOut"
          }}
          style={{ originY: 0.5 }}
        />

        {/* Left Pupil (Following Cursor) */}
        <motion.rect
          width={PUPIL_SIZE}
          height={PUPIL_SIZE}
          fill="#000000"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
          style={{
            x: pupils.left.centerX - PUPIL_SIZE / 2,
            y: pupils.left.centerY - PUPIL_SIZE / 2,
            translateX: pupilX,
            translateY: pupilY
          }}
        />

        {/* Right Pupil (Following Cursor) */}
        <motion.rect
          width={PUPIL_SIZE}
          height={PUPIL_SIZE}
          fill="#000000"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
          style={{
            x: pupils.right.centerX - PUPIL_SIZE / 2,
            y: pupils.right.centerY - PUPIL_SIZE / 2,
            translateX: pupilX,
            translateY: pupilY
          }}
        />
      </svg>
    </div>
  );
};
