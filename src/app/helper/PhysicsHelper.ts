import {Node, NodeType} from "../classes/graph/node"
import {Edge} from "../classes/graph/edge"
import {BoundingBox} from "../classes/graph/bounding-box";

export class PhysicsHelper {

    static k: number = 0.01
    static damping: number = 0.7
    static repulsionStrength: number = 3000
    static boundaryForce: number = 0.1  // Force to keep nodes within boundaries
    static nodeDiameter: number = 50  // Radius of the node, used for padding
    static nodeRadius: number = PhysicsHelper.nodeDiameter / 2

    //DFG EventLog Text
    static eventLogWidth: number = 200
    static eventLogTextPadding: number = 40
    static lineHeight: number = 14
    static characterWidth: number = 9
    static eventLogRadius: number = PhysicsHelper.eventLogWidth / 2

    //place
    static placeDiameter = 50
    static placeRadius = PhysicsHelper.placeDiameter / 2

    // Calculate spring (attractive) force for edges
    public static calculateAttractionForce(edges: Edge[]): void {
        for (const edge of edges) {
            const isEventLog = edge.source.type === NodeType.eventLog || edge.target.type === NodeType.eventLog

            const dx = edge.target.x - edge.source.x
            const dy = edge.target.y - edge.source.y
            let distance = Math.sqrt(dx * dx + dy * dy)
            if (distance == 0) distance = 1
            let force = (distance - 100) * PhysicsHelper.k

            if(isEventLog) force *= 0.8

            const fx = (dx / distance) * force
            const fy = (dy / distance) * force

            if (!edge.source.isDragged) {
                edge.source.vx += fx
                edge.source.vy += fy
            }
            if (!edge.target.isDragged) {
                edge.target.vx -= fx
                edge.target.vy -= fy
            }
        }
    }

    // Calculate repulsive force between every pair of nodes
    public static calculateRepulsionForce(nodes: Node[]): void {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i]
                const nodeB = nodes[j]

                const dx = nodeB.x - nodeA.x
                const dy = nodeB.y - nodeA.y
                const distance = Math.sqrt(dx * dx + dy * dy) || 1  // Prevent division by zero

                const isEventLog = nodeA.type === NodeType.eventLog || nodeB.type === NodeType.eventLog

                // Calculate repulsive force (Coulomb-like)
                let force = (PhysicsHelper.repulsionStrength*3 / (distance * distance))
                if(isEventLog) force *= 7

                // Apply the force in opposite directions to each node
                const fx = (dx / distance) * force
                const fy = (dy / distance) * force

                if (!nodeA.isDragged) {
                    nodeA.vx -= fx
                    nodeA.vy -= fy
                }
                if (!nodeB.isDragged) {
                    nodeB.vx += fx
                    nodeB.vy += fy
                }
            }
        }
    }

    // Update node positions, apply damping, and enforce boundary conditions with padding
    public static updateNodePositions(nodes: Node[], canvasWidth: number, canvasHeight: number, isDFG: boolean): void {
        for (const node of nodes) {
            //fixed Position for play / stop in DFG view
            if (isDFG){
                if (node.name==='play') {
                    node.x=canvasWidth / 2
                    node.y= 25
                    continue
                }
                if (node.name==='stop') {
                    node.x=canvasWidth/2
                    node.y= canvasHeight - 25
                    continue
                }
            }
            // fixed Position start/stop in Petrinet-View
            if (node.name==='place_play') {
                node.x=25
                node.y= canvasHeight / 2
                continue
            }
            if (node.name==='place_stop') {
                node.x=canvasWidth - 25
                node.y= canvasHeight / 2
                continue
            }
            const halfWidth = node.width / 2
            const halfHeight = node.height / 2
            if (!node.isDragged) {
                node.vx *= PhysicsHelper.damping
                node.vy *= PhysicsHelper.damping
                node.x += node.vx
                node.y += node.vy

                // Boundary force with padding to keep nodes within canvas
                if (node.x < halfWidth) {
                    node.vx += PhysicsHelper.boundaryForce
                } else if (node.x > canvasWidth - halfWidth) {
                    node.vx -= PhysicsHelper.boundaryForce
                }
                if (node.y < halfHeight) {
                    node.vy += PhysicsHelper.boundaryForce
                } else if (node.y > canvasHeight - halfHeight) {
                    node.vy -= PhysicsHelper.boundaryForce
                }

                // Clamp positions to stay within the canvas, considering the node radius
                node.x = Math.max(halfWidth, Math.min(canvasWidth - halfWidth, node.x))
                node.y = Math.max(halfHeight, Math.min(canvasHeight - halfHeight, node.y))
            }
        }
    }

    public static calculateBoundingBoxEventLog(eventLog: string[][]): BoundingBox {
        const height = eventLog.length * this.lineHeight + this.eventLogTextPadding
        const eventWidths: Array<number> = eventLog.map(events => {
            let length: number = 0
            events.map(eventEntry => eventEntry.length).forEach(eventLength => length += eventLength)
            return length
        })
        const width = Math.max(...eventWidths) * this.characterWidth + this.eventLogTextPadding

        return {
            x: 0,
            y: 0,
            width: width,
            height: height
        }
    }

    public static calculateEventLogHeight(eventLog: string[][]): number {
        return PhysicsHelper.eventLogTextPadding + (eventLog.length * PhysicsHelper.lineHeight)
    }
}
