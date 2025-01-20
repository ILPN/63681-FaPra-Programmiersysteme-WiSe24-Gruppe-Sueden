import {Component, EventEmitter, input, OnInit, Output} from "@angular/core";
import {DirectlyFollows} from "../../../classes/directly-follows";
import {PhysicsHelper} from "../../../helper/PhysicsHelper";
import {DfgNode} from "../../../classes/graph/dfg-node";
import {TruncateEventLogPipe} from "./truncate-event-log.pipe";

@Component({
    selector: 'g[EventLog]',
    standalone: true,
    imports: [
        TruncateEventLogPipe
    ],
    templateUrl: 'event-log.component.html'
})
export class EventLogComponent implements OnInit {
    dfgNode = input.required<DfgNode>()
    @Output() dfgClicked = new EventEmitter<DfgNode>()

    boundingBox = {x: 0, y: 0, width: 0, height: 0}

    constructor() {
    }

    ngOnInit(): void {
        this.boundingBox = PhysicsHelper.calculateBoundingBoxEventLog(this.dfgNode().dfg.eventLog)
    }

    protected readonly PhysicsHelper = PhysicsHelper;
}
