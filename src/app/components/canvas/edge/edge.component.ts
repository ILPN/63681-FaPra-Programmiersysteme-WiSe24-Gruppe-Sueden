import {Component, input} from "@angular/core";
import {PhysicsHelper} from "src/app/helper/PhysicsHelper";
import {Edge} from "../../../classes/graph/edge";
import {Node} from "../../../classes/graph/node";
import {NodeType} from "../../../classes/graph/node";

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
    ): { x: number, y: number } {
        // Function to determine the node's radius based on its type
        const getNodeRadius = (node: Node): number => {
            return node.type === NodeType.eventLog
                ? PhysicsHelper.eventLogRadius
                : PhysicsHelper.nodeRadius;
        };

        const sourceRadius = getNodeRadius(source);
        const targetRadius = getNodeRadius(target);

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: source.x, y: source.y };
        }

        // Unit vector for the line
        const unitX = dx / distance;
        const unitY = dy / distance;

        // Perpendicular offset for separating arrows
        const perpendicularOffset = applyOffset ? 5 : 0;
        const offsetX = -unitY * perpendicularOffset;
        const offsetY = unitX * perpendicularOffset;

        // Adjust for node radius and apply offset
        if (isEnd) {
            return {
                x: target.x - unitX * targetRadius + offsetX,
                y: target.y - unitY * targetRadius + offsetY
            };
        } else {
            return {
                x: source.x + unitX * sourceRadius + offsetX,
                y: source.y + unitY * sourceRadius + offsetY
            };
        }
    }


}
