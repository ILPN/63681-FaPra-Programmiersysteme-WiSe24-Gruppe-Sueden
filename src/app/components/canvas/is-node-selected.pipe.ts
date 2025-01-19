import {Pipe, PipeTransform} from "@angular/core";
import {Node} from "../../classes/graph/node";

@Pipe({
    standalone: true,
    name: "isSelected"
})
export class IsNodeSelectedPipe implements PipeTransform {

    transform(value: string, selectedNodes: Array<Node>): boolean {
        return selectedNodes.some(it => it.name == value)
    }

}
