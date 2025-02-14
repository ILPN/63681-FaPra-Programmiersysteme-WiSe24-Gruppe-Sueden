import {Arc} from "./arc";
import {Node} from "./graph/node";
import {DfgNode} from "./graph/dfg-node";


/**
 * Interface representing a Process Graph or PetriNet, which includes a set of nodes, places, transitions, and arcs.
 *
 * @interface
 */
export interface ProcessGraph {
    /**
     * A set of DfgNode objects that represent the Eventlogs and include their DFGs.
     *
     * @type {Set<DfgNode>}
     */
    dfgSet: Set<DfgNode>;

    /**
     * A set of Node objects that represent the places in the PetriNet.
     *
     * @type {Set<Node>}
     */
    places: Set<Node>;

    /**
     * A set of Node objects that represent the transitions in the PetriNet.
     *
     * @type {Set<Node>}
     */
    transitions: Set<Node>;

    /**
     * A list of Arc objects representing the connections between nodes in the process graph.
     * Each arc defines a relationship between a source and a target node in the model.
     *
     * @type {Arc[]}
     */
    arcs: Arc[];
}
