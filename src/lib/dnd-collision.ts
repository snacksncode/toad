import { CollisionPriority, CollisionType } from "@dnd-kit/abstract"
import type { CollisionDetector } from "@dnd-kit/abstract"

/**
 * Custom collision detector that skips self-collision.
 *
 * The default @dnd-kit collision observer doesn't exclude the dragged element
 * from collision detection. When using the Feedback plugin (which moves the
 * dragged element to follow the pointer), the dragged card always wins the
 * collision check because the pointer is inside it and it has higher priority
 * than columns. This causes cross-column drag to silently no-op.
 *
 * This detector adds a `source.id === droppable.id` guard, then falls through
 * to standard pointerIntersection → shapeIntersection logic.
 */
export const skipSelfCollision: CollisionDetector = ({
  dragOperation,
  droppable,
}) => {
  // The dragged element should never be its own drop target
  if (dragOperation.source?.id === droppable.id) {
    return null
  }

  // Pointer intersection (highest priority — pointer is inside droppable shape)
  const pointerCoordinates = dragOperation.position?.current
  if (pointerCoordinates && droppable.shape?.containsPoint(pointerCoordinates)) {
    const dx = droppable.shape.center.x - pointerCoordinates.x
    const dy = droppable.shape.center.y - pointerCoordinates.y
    const distance = Math.hypot(dx, dy)

    return {
      id: droppable.id,
      value: 1 / distance,
      type: CollisionType.PointerIntersection,
      priority: CollisionPriority.High,
    }
  }

  // Shape intersection fallback (drag shape overlaps droppable shape)
  const shape = dragOperation.shape
  if (shape?.current && droppable.shape) {
    const intersectionArea = shape.current.intersectionArea(droppable.shape)
    if (intersectionArea) {
      const pos = dragOperation.position.current
      const dx = droppable.shape.center.x - pos.x
      const dy = droppable.shape.center.y - pos.y
      const distance = Math.hypot(dx, dy)
      const intersectionRatio =
        intersectionArea / (shape.current.area + droppable.shape.area - intersectionArea)

      return {
        id: droppable.id,
        value: intersectionRatio / distance,
        type: CollisionType.ShapeIntersection,
        priority: CollisionPriority.Normal,
      }
    }
  }

  return null
}
