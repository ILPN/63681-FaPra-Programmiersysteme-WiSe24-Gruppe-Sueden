import {effect, Injectable, signal} from "@angular/core";
import {CutType} from "../classes/cut-type.enum";
import {SelectionType} from "../classes/selection-type.enum";
import {FallthroughType} from "../classes/fallthrough.enum";

@Injectable({providedIn: 'root'})
export class ToolbarService {

    useSpringEmbedder = signal(true)
    cutType = signal<CutType | null>(CutType.XOR)
    fallthroughType = signal<FallthroughType | null>(null)
    selectionType = signal(SelectionType.NONE)

    constructor() {
        // Unset fallthrough if cut is set
        effect(() => {
            if (this.cutType()) {
                this.fallthroughType.set(null)
            }
        }, {allowSignalWrites: true})

        // Unset cut if fallthrough is set
        effect(() => {
            if (this.fallthroughType()) {
                this.cutType.set(null)
            }
        }, {allowSignalWrites: true})
    }

}
