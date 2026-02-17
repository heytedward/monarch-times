# Mondrian View - Technical Implementation Guide

This guide details how to recreate the **Mondrian Grid View** component used in Monarch Times. This view creates a dynamic, living composition that resembles a Piet Mondrian painting, where content "ages" and shrinks over time as new items arrive.

## 1. Tech Stack (View Only)

To recreate *just* this view, you need:

*   **Framework:** React (v18+) with TypeScript
*   **Styling:** Tailwind CSS (v3+)
*   **Layout Engine:** Native CSS Grid
*   **State Management:** Zustand (or any store to hold the list of items)

## 2. The Concept

The core concept is a **Position-Based Grid System**. Unlike traditional masonry layouts that pack items based on height, this system forces items into specific shapes based on their *index* (recency) in the list.

1.  **The Canvas:** A 6-column CSS Grid.
2.  **The Rules:**
    *   **#1 (Newest):** Hero Size (4x3 blocks).
    *   **#2-3:** Featured Size (2x2 blocks).
    *   **#4-7:** Standard Size (2x1 blocks).
    *   **#8+:** Small squares (1x1 blocks).
3.  **The Aesthetic:** "De Stijl" art movement principles (Primary colors, thick black borders, rectangular forms).

## 3. Implementation Details

### A. The Grid Container

The container uses standard CSS Grid with `dense` auto-flow to ensure no gaps are left if items resize.

```tsx
<div
  className="grid gap-1"
  style={{
    // Fixed 6-column layout
    gridTemplateColumns: 'repeat(6, 1fr)',
    // Fixed row height gives predictable shapes
    gridAutoRows: '120px',
    // 'dense' fills holes if small items fit before large ones
    gridAutoFlow: 'dense',
  }}
>
  {/* Grid Items go here */}
</div>
```

### B. The Sizing Algorithm

This is the "brain" of the layout. It maps an item's list index to a grid span.

```typescript
type GridSize = 'hero' | 'featured' | 'standard' | 'fading' | 'minimal' | 'burning';

function getGridSizeByPosition(index: number): { size: GridSize; colSpan: number; rowSpan: number } {
  // Newest item is the big "Hero"
  if (index === 0) {
    return { size: 'hero', colSpan: 4, rowSpan: 3 };
  }
  // Next 2 items are large squares
  if (index <= 2) {
    return { size: 'featured', colSpan: 2, rowSpan: 2 };
  }
  // Next 4 items are wide rectangles
  if (index <= 6) {
    return { size: 'standard', colSpan: 2, rowSpan: 1 };
  }
  // The rest are small 1x1 squares
  return { size: 'minimal', colSpan: 1, rowSpan: 1 };
}
```

### C. The Styling (De Stijl Theme)

The visual identity relies on specific color mappings and border utilities.

**Topic Colors:**
```typescript
const TOPIC_COLORS = {
  fashion: '#FF0000',    // Red
  music: '#0052FF',      // Blue
  philosophy: '#FFD700', // Yellow
  art: '#FF6B00',        // Orange
  gaming: '#9945FF',     // Purple
  general: '#FFFFFF',    // White
};
```

**Card Styles (Tailwind):**
```tsx
<div
  className={`
    relative overflow-hidden cursor-pointer
    border-4 border-black  // The signature thick border
    transition-all duration-800 ease-cubic-bezier
  `}
  style={{
    gridColumn: `span ${colSpan}`,
    gridRow: `span ${rowSpan}`,
    backgroundColor: topicColors[item.topic],
  }}
>
  {/* Content */}
</div>
```

### D. Animations (The "Living" Aspect)

To make the grid feel alive, we add specific CSS animations:

1.  **Push Effect:** When a new item arrives at Index 0, it pushes everything else down. CSS transitions on `gridColumn` and `gridRow` handle this smoothly if the `key` is stable (the item ID).
2.  **Shimmer:** Added to 'Hero' items to draw attention.
3.  **Burning/Fading:** Items at the very end of the list (Index > 10) get opacity reduction or a grayscale filter to symbolize "archiving".

## 4. Full Component Skeleton

Here is how you assemble it:

```tsx
import { useMemo } from 'react';

export default function MondrianGrid({ items }) {
  
  // 1. Process items to assign sizes
  const gridCells = useMemo(() => {
    // Sort by date new -> old
    const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
    
    // Map to grid configuration
    return sorted.map((item, index) => ({
      item,
      ...getGridSizeByPosition(index) // Apply the algorithm
    }));
  }, [items]);

  return (
    <div className="w-full p-4 bg-[#f0f0f0]">
      <div 
        className="grid gap-1"
        style={{
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridAutoRows: '120px',
          gridAutoFlow: 'dense',
        }}
      >
        {gridCells.map(({ item, size, colSpan, rowSpan }) => (
          <div
            key={item.id}
            className="border-4 border-black relative p-3 transition-all duration-500"
            style={{
              gridColumn: `span ${colSpan}`,
              gridRow: `span ${rowSpan}`,
              backgroundColor: getTopicColor(item.topic)
            }}
          >
            {/* Render content based on 'size' */}
            {size === 'hero' && <h1>{item.title}</h1>}
            {size === 'minimal' && <small>{item.topic}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 5. Summary

The Mondrian View is not just a style; it's a **data visualization** of time.
*   **Recency = Size:** Newer items are physically larger.
*   **Topic = Color:** Category is immediately identifiable by hue.
*   **Age = Position:** Items naturally flow from top-left (new) to bottom-right (old).
