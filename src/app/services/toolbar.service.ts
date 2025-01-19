import {Injectable, signal} from "@angular/core";
import {CutType} from "../classes/cut-type.enum";
import {SelectionType} from "../classes/selection-type.enum";

@Injectable({providedIn: 'root'})
export class ToolbarService {

    useSpringEmbedder = signal(true)
    cutType = signal(CutType.SEQUENCE)
    selectionType = signal(SelectionType.NONE)

}
