import {Component, EventEmitter, input, Output} from "@angular/core";
import {PhysicsHelper} from "../../../helper/PhysicsHelper";
import {Node} from "../../../classes/graph/node";

@Component({
    selector: 'svg:g[Node]',
    standalone: true,
    templateUrl: 'node.component.html'
})
export class NodeComponent {

    @Output() nodeMouseDown: EventEmitter<Node> = new EventEmitter()
    @Output() nodeMouseUp: EventEmitter<Node> = new EventEmitter()

    node = input.required<Node>()

    protected readonly PhysicsHelper = PhysicsHelper;
}
