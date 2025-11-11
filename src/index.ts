// src/index.ts
import putPositions from './views/Positions.vue'

// Named export
export { putPositions }

// Default export (optional)
export default putPositions

// Props interface
export interface putPositionsProps {
  symbolRoot: string    // Root symbol of the instrument
  userId?: string | null    // Current user ID for access control
}
