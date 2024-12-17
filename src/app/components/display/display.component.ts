import {Component, inject, signal} from "@angular/core";
import {CutType} from "../../classes/cut-type.enum";
import {SelectionType} from "../../classes/selection-type.enum";
import {ProcessGraphService} from "../../services/process-graph.service";

@Component({
    selector: 'app-display',
    templateUrl: './display.component.html',
    styleUrls: ['./display.component.scss']
})
export class DisplayComponent {

    protected graphService = inject(ProcessGraphService)

    protected useSpringEmbedder = signal(true)
    protected cutType = signal(CutType.SEQUENCE)
    protected selectionType = signal(SelectionType.NONE)
    protected showEventlog = signal(false)

}
