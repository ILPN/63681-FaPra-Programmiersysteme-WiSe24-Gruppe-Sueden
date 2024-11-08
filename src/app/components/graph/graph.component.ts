import {Component, OnInit} from '@angular/core';
import {Edge} from "../../classes/graph/edge";
import {Node} from "../../classes/graph/node";
import {PhysicsHelper} from "../../helper/PhysicsHelper";

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
        // Initialize nodes and edges with some sample data
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
            this.edges.push({source: this.nodes[i], target: this.nodes[i + 1]});
        }
    }

    startSimulation() {
        setInterval(() => this.updatePhysics(), 10);
    }

    updatePhysics() {
        PhysicsHelper.calculateRepulsionForce(this.nodes)
        PhysicsHelper.calculateAttractionForce(this.edges)
        PhysicsHelper.updateNodePositions(this.nodes, this.width, this.height)
    }

    onDragStart(node: Node) {
        node.isDragged = true;
    }

    onDrag(node: Node, event: MouseEvent) {
        if (node.isDragged) {
            node.x = event.offsetX;
            node.y = event.offsetY;
        }
    }

    onDragEnd(node: Node) {
        node.isDragged = false;
    }

    protected readonly PhysicsHelper = PhysicsHelper;
}
