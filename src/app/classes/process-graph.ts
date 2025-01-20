import {Arc} from "./arc";
import {Node} from "./graph/node";
import {DfgNode} from "./graph/dfg-node";



export interface ProcessGraph {
    dfgSet: Set<DfgNode>
    places: Set<Node>;
    transitions: Set<Node>;
    arcs: Arc[];
}
