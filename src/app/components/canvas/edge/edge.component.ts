import {Component, input} from "@angular/core"
import {Edge} from "../../../classes/graph/edge"
import {Node} from "../../../classes/graph/node"

@Component({
    selector: 'g[Edge]',
    standalone: true,
    templateUrl: 'edge.component.html'
})
export class EdgeComponent {

    edge = input.required<Edge>()

    calculateEdgeOffset(
        source: Node,
        target: Node,
        isEnd: boolean,
        applyOffset: boolean
    ): { x: number; y: number } {
        // 1. Direction from source center to target center
        const dx = target.x - source.x
        const dy = target.y - source.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Edge case: If both nodes have the exact same coordinates
        if (distance === 0) {
            return {x: source.x, y: source.y}
        }

        // Unit direction vector
        const unitX = dx / distance
        const unitY = dy / distance

        // Perpendicular offset for arrow separation
        const perpendicularOffset = applyOffset ? 5 : 0
        const offsetX = -unitY * perpendicularOffset
        const offsetY = unitX * perpendicularOffset

        // 2. Depending on whether we want the start (source side) or end (target side),
        //    we'll compute the rectangle intersection differently.
        //    - For the source intersection, we take the line from source center outward (dx, dy).
        //    - For the target intersection, we want the line from target center inward,
        //      which is effectively (-dx, -dy) if we think of it as "target to source".
        let intersection: { x: number; y: number }
        if (isEnd) {
            intersection = this.getRectIntersection(
                target.x,
                target.y,
                target.width,
                target.height,
                -dx, // direction from target -> source so we find the "incoming" edge
                -dy
            )
            // After we compute that intersection, we add the arrow offset
            return {
                x: intersection.x + offsetX,
                y: intersection.y + offsetY,
            }
        } else {
            intersection = this.getRectIntersection(
                source.x,
                source.y,
                source.width,
                source.height,
                dx, // direction from source -> target
                dy
            )
            // Apply arrow offset
            return {
                x: intersection.x + offsetX,
                y: intersection.y + offsetY,
            }
        }
    }

    private getRectIntersection(
        cx: number,
        cy: number,
        width: number,
        height: number,
        dirX: number,
        dirY: number
    ): { x: number; y: number } {
        // Half-dimensions
        const hw = width / 2
        const hh = height / 2

        // If direction is zero length (shouldn't happen if distance != 0, but just in case):
        if (dirX === 0 && dirY === 0) {
            return {x: cx, y: cy}
        }

        // We'll check intersection with each of the 4 edges (left, right, top, bottom),
        // compute the valid intersection parameter t along the ray, and pick the smallest t>0.

        // param 't' for parametric line:
        //   X(t) = cx + t * dirX
        //   Y(t) = cy + t * dirY

        const tValues: number[] = []

        // 1) Check vertical boundaries: left or right
        if (dirX > 0) {
            // intersection with right boundary x = cx + hw
            const t = (hw) / dirX
            tValues.push(t)
        } else if (dirX < 0) {
            // intersection with left boundary x = cx - hw
            const t = (-hw) / dirX
            tValues.push(t)
        }

        // 2) Check horizontal boundaries: top or bottom
        if (dirY > 0) {
            // intersection with bottom boundary y = cy + hh
            const t = (hh) / dirY
            tValues.push(t)
        } else if (dirY < 0) {
            // intersection with top boundary y = cy - hh
            const t = (-hh) / dirY
            tValues.push(t)
        }

        // Among all valid t > 0, we want the smallest that actually hits the rectangle
        let bestT = Number.POSITIVE_INFINITY
        for (const candidateT of tValues) {
            if (candidateT > 0 && candidateT < bestT) {
                bestT = candidateT
            }
        }

        // Now compute that intersection
        const ix = cx + bestT * dirX
        const iy = cy + bestT * dirY

        return {x: ix, y: iy}
    }

    calculateSelfLoopPath(node: Node): string {
        const cx = node.x
        const cy = node.y
        const halfW = node.width / 2

        // We'll pick a "start" near the top-right corner of the node:
        const startX = cx + halfW
        const startY = cy - 10 // 10 px above center, or above the corner

        // First control point
        const c1x = startX + 40
        const c1y = startY
        // Second control point
        const c2x = startX + 40
        const c2y = cy + 10
        // End point (where the arrow head will appear)
        const endX = cx + halfW
        const endY = cy + 10

        // Combine into an SVG path string (cubic Bézier)
        return [
            `M ${startX},${startY}`,
            `C ${c1x},${c1y} ${c2x},${c2y} ${endX},${endY}`
        ].join(" ")

    }
}
