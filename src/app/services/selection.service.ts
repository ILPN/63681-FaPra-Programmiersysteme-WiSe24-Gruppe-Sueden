import {Injectable, signal, WritableSignal} from "@angular/core";
import {Point} from "../classes/point";
import {Node} from "../classes/graph/node";
import {DirectlyFollows} from "../classes/directly-follows";
import {DfgNode} from "../classes/graph/dfg-node";

@Injectable({
    providedIn: "root"
})
export class SelectionService {

    lassoSelectionPolygon: WritableSignal<Array<Point>> = signal([])
    selectedNodes: WritableSignal<Array<Node>> = signal([])
    selectedDfg: WritableSignal<DfgNode | null> = signal(null)

    public updatePolygon(polygon: Array<Point>) {
        for(const node of this.selectedNodes()) {
            node.isSelected = false
        }
        this.selectedNodes.set([])
        this.lassoSelectionPolygon.set(polygon)
    }

    public toggleNodeSelected(node: Node): void {
        node.isSelected = !node.isSelected
        const selectedNodes = this.selectedNodes()
        const index = selectedNodes.findIndex(entry => entry.name === node.name)
        index !== -1 ? selectedNodes.splice(index, 1) : selectedNodes.push(node)
        this.selectedNodes.set([...selectedNodes])
    }

    selectDfg(dfg: DfgNode) {
        this.selectedDfg.update(oldDfg => oldDfg?.name === dfg.name ? null : dfg)
    }

    reset() {
        this.selectedDfg.set(null)
        this.selectedNodes.set([])
        this.lassoSelectionPolygon.set([])
    }
}
