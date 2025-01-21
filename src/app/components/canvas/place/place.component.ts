import {Component, EventEmitter, input, Output} from "@angular/core";
import {PhysicsHelper} from "../../../helper/PhysicsHelper";
import {Node} from "../../../classes/graph/node"

@Component({
    selector: 'g[Place]',
    standalone: true,
    templateUrl: 'place.component.html'
})
export class PlaceComponent {

    @Output() nodeMouseDown: EventEmitter<Node> = new EventEmitter()
    @Output() nodeMouseUp: EventEmitter<Node> = new EventEmitter()
    place = input.required<Node>()

    protected readonly PhysicsHelper = PhysicsHelper;
}
