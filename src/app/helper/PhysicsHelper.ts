import {Node} from "../classes/graph/node";
import {Edge} from "../classes/graph/edge";

export class PhysicsHelper {
    static k: number = 0.3;
    static damping: number = 0.7;
    static repulsionStrength: number = 2000;
    static boundaryForce: number = 0.1;  // Force to keep nodes within boundaries
    static nodeRadius: number = 10;  // Radius of the node, used for padding

    // Calculate spring (attractive) force for edges
    public static calculateAttractionForce(edges: Edge[]): void {
        for (const edge of edges) {
            const dx = edge.target.x - edge.source.x;
            const dy = edge.target.y - edge.source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = (distance - 100) * PhysicsHelper.k;

            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            if (!edge.source.isDragged) {
                edge.source.vx += fx;
                edge.source.vy += fy;
            }
            if (!edge.target.isDragged) {
                edge.target.vx -= fx;
                edge.target.vy -= fy;
            }
        }
    }

    // Calculate repulsive force between every pair of nodes
    public static calculateRepulsionForce(nodes: Node[]): void {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;  // Prevent division by zero

                // Calculate repulsive force (Coulomb-like)
                const force = (PhysicsHelper.repulsionStrength / (distance * distance));

                // Apply the force in opposite directions to each node
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                if (!nodeA.isDragged) {
                    nodeA.vx -= fx;
                    nodeA.vy -= fy;
                }
                if (!nodeB.isDragged) {
                    nodeB.vx += fx;
                    nodeB.vy += fy;
                }
            }
        }
    }

    // Update node positions, apply damping, and enforce boundary conditions with padding
    public static updateNodePositions(nodes: Node[], canvasWidth: number, canvasHeight: number): void {
        for (const node of nodes) {
            if (!node.isDragged) {
                node.vx *= PhysicsHelper.damping;
                node.vy *= PhysicsHelper.damping;
                node.x += node.vx;
                node.y += node.vy;

                // Boundary force with padding to keep nodes within canvas
                if (node.x < PhysicsHelper.nodeRadius) {
                    node.vx += PhysicsHelper.boundaryForce;
                } else if (node.x > canvasWidth - PhysicsHelper.nodeRadius) {
                    node.vx -= PhysicsHelper.boundaryForce;
                }
                if (node.y < PhysicsHelper.nodeRadius) {
                    node.vy += PhysicsHelper.boundaryForce;
                } else if (node.y > canvasHeight - PhysicsHelper.nodeRadius) {
                    node.vy -= PhysicsHelper.boundaryForce;
                }

                // Clamp positions to stay within the canvas, considering the node radius
                node.x = Math.max(PhysicsHelper.nodeRadius, Math.min(canvasWidth - PhysicsHelper.nodeRadius, node.x));
                node.y = Math.max(PhysicsHelper.nodeRadius, Math.min(canvasHeight - PhysicsHelper.nodeRadius, node.y));
            }
        }
    }
}
