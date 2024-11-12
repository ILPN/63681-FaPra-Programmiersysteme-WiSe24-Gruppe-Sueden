import {Component} from "@angular/core";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import {DirectlyFollows} from "../../classes/directly-follows";
import {ProcessGraphService} from '../../services/process-graph.service';


@Component({
    standalone: true,
    selector: 'data-input',
    templateUrl: './data-input.component.html',
    styleUrls: ['./data-input.component.css'],
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        MatButton
    ]
})
export class DataInputComponent {

    constructor(private processGraphService: ProcessGraphService) { }

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
        const result: string[][] = []
        const dom = new DOMParser().parseFromString(await file.text(), 'text/xml')
        const traceNodes = dom.getElementsByTagName("trace")
        for (let i = 0; i < traceNodes.length; i++) {
            const events: string[] = []
            const traceEventNodes = traceNodes[i].getElementsByTagName("event")
            for (let j = 0; j < traceEventNodes.length; j++) {
                events.push(traceEventNodes[j].firstElementChild!.getAttribute("value") as string)
            }
            result.push(events)
        }
//TODO: Error-Handling und Null-Prüfung
        // Umwandeln des result in ein DFG Objekt
        let directlyFollowsGraph = new DirectlyFollows();
        for (const trace of result) {
            let tempElement = trace[0];
            directlyFollowsGraph.addSuccessor("play", tempElement)
            let traceLength = trace.length;
            for (let i=1; i < traceLength; i++) {
                directlyFollowsGraph.addSuccessor(tempElement, trace[i]);
                tempElement = trace[i];
            }
            directlyFollowsGraph.addSuccessor(trace[traceLength-1],"stop")
        }
        directlyFollowsGraph.createPredecessorMap();
        directlyFollowsGraph.setEventLog(result);

        this.processGraphService.addDfg(directlyFollowsGraph);


    }

    /***************************************************************** Manual Input *****************************************************************/
    protected parseEventLog(log: string) {

    }

}
