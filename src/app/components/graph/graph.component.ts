import { Component, OnInit } from '@angular/core';
import {Edge} from "../../classes/graph/edge";
import {Node} from "../../classes/graph/node";

@Component({
    selector: 'app-graph',
    templateUrl: './graph.component.html',
    styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {
    nodes: Node[] = [];
    edges: Edge[] = [];
    width = 800;
    height = 600;

    ngOnInit() {
        this.initGraph();
        this.startSimulation();
    }

    initGraph() {
        // Initialize nodes and edges
        for (let i = 0; i < 10; i++) {
            this.nodes.push({
                id: i,
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: 0,
                vy: 0,
                isDragged: false
            });
        }

        for (let i = 0; i < this.nodes.length - 1; i++) {
            this.edges.push({ source: this.nodes[i], target: this.nodes[i + 1] });
        }
    }

    startSimulation() {
        setInterval(() => this.updatePhysics(), 16);  // Roughly 60 FPS
    }

    updatePhysics() {
        const k = 0.2;  // Spring constant for faster attraction
        const damping = 0.8;  // Reduced damping for quicker stabilization
        const repulsionStrength = 800;  // Increased repulsion strength for faster spread
        const boundaryForce = 0.1;  // Force to keep nodes within boundaries
        const nodeRadius = 10;  // Radius of the node, used for padding

        // Calculate repulsive force between every pair of nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeA = this.nodes[i];
                const nodeB = this.nodes[j];

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;  // Prevent division by zero

                // Calculate repulsive force (Coulomb-like)
                const force = (repulsionStrength / (distance * distance));

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

        // Calculate spring (attractive) force for edges
        for (const edge of this.edges) {
            const dx = edge.target.x - edge.source.x;
            const dy = edge.target.y - edge.source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = (distance - 100) * k;

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

        // Update node positions, apply damping, and enforce boundary conditions with padding
        for (const node of this.nodes) {
            if (!node.isDragged) {
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx;
                node.y += node.vy;

                // Boundary force with padding to keep nodes within canvas
                if (node.x < nodeRadius) {
                    node.vx += boundaryForce;
                } else if (node.x > this.width - nodeRadius) {
                    node.vx -= boundaryForce;
                }
                if (node.y < nodeRadius) {
                    node.vy += boundaryForce;
                } else if (node.y > this.height - nodeRadius) {
                    node.vy -= boundaryForce;
                }

                // Clamp positions to stay within the canvas, considering the padding
                node.x = Math.max(nodeRadius, Math.min(this.width - nodeRadius, node.x));
                node.y = Math.max(nodeRadius, Math.min(this.height - nodeRadius, node.y));
            }
        }
    }




    onDragStart(node: Node) {
        node.isDragged = true;
    }

    onDrag(node: Node, event: MouseEvent) {
        if(node.isDragged) {
            node.x = event.offsetX;
            node.y = event.offsetY;
        }
    }

    onDragEnd(node: Node) {
        node.isDragged = false;
    }
}
