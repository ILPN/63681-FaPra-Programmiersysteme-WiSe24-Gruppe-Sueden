import {Component, EventEmitter, HostListener, input, Output, signal, WritableSignal} from "@angular/core";
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
export class EventLogComponent {

    dfgNode = input.required<DfgNode>()
    @Output() dfgClicked = new EventEmitter<DfgNode>()
    @Output() resizingStatus = new EventEmitter<boolean>();

    eventLogWidth: WritableSignal<number> = signal(PhysicsHelper.eventLogWidth)
    isResizing = false
    startX = 0

    protected readonly PhysicsHelper = PhysicsHelper

    // Called when user starts dragging the resizer
    onResizeStart(event: MouseEvent): void {
        this.isResizing = true
        this.startX = event.clientX
        event.preventDefault()
        this.resizingStatus.emit(true)
    }

    // Called when user is dragging
    @HostListener('document:mousemove', ['$event'])
    onResizing(event: MouseEvent): void {
        if (this.isResizing) {
            const deltaX = event.clientX - this.startX
            this.eventLogWidth.update(old => old += deltaX)
            this.dfgNode().width += deltaX
            this.startX = event.clientX

            // Ensure a minimum width
            if (this.eventLogWidth() < PhysicsHelper.eventLogWidth) {
                this.eventLogWidth.set(PhysicsHelper.eventLogWidth)
            }
        }
    }

    // Called when user releases the mouse
    @HostListener('document:mouseup')
    onResizeEnd(): void {
        if (this.isResizing) {
            this.isResizing = false
        }
        this.resizingStatus.emit(false)
    }

}
