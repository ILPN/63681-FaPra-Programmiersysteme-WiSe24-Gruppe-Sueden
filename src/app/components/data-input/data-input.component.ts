import {Component} from "@angular/core";
import {MatError, MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import {ProcessGraphService} from '../../services/process-graph.service';
import {FormControl, ReactiveFormsModule, ValidatorFn} from "@angular/forms";

@Component({
    standalone: true,
    selector: 'data-input',
    templateUrl: './data-input.component.html',
    styleUrls: ['./data-input.component.css'],
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        MatButton,
        ReactiveFormsModule,
        MatError
    ]
})
export class DataInputComponent {

    constructor(private processGraphService: ProcessGraphService) {
    }

    /***************************************************************** File *****************************************************************/
    protected dragCounter = 0

    protected onFileInputChange(event: Event) {
        const input = event.target as HTMLInputElement
        const file = input.files![0]
        input.value = ''
        this.handleFile(file)
    }

    protected onDragEnter(e: DragEvent) {
        if (e.dataTransfer!.types[0] === 'Files') {
            this.dragCounter++
        }
    }

    protected onDragLeave(e: DragEvent) {
        if (e.dataTransfer!.types[0] === 'Files') {
            this.dragCounter--
        }
    }

    protected onDrop(event: DragEvent) {
        event.preventDefault()
        this.dragCounter = 0
        this.handleFile(event.dataTransfer!.files[0])
    }

    protected async handleFile(file: File) {
        const eventLog: string[][] = []
        const dom = new DOMParser().parseFromString(await file.text(), 'text/xml')
        const traceNodes = dom.getElementsByTagName("trace")
        for (let i = 0; i < traceNodes.length; i++) {
            const events: string[] = []
            const traceEventNodes = traceNodes[i].getElementsByTagName("event")
            for (let j = 0; j < traceEventNodes.length; j++) {
                events.push(traceEventNodes[j].firstElementChild!.getAttribute("value") as string)
            }
            eventLog.push(events)
        }

        this.processGraphService.createGraph(eventLog)
    }

    /***************************************************************** Manual Input *****************************************************************/
    protected eventLogValidator: ValidatorFn = control => {
        const val = control?.value as string
        if (!!val && val.match(/^[a-zA-Z0-9 +]+$/)) {
            return null
        }
        return {invalid: true}
    }

    protected manualInputControl = new FormControl("event1 event2 event3 + event3 event1 event2 + event8 event1 event2", [this.eventLogValidator])

    protected parseEventLog() {
        const result: string[][] = this.manualInputControl.value!.split("+").map(rawTrace => {
            return rawTrace.trim().split(" ").filter(it => it !== "")
        })
        this.processGraphService.createGraph(result)
    }

}
