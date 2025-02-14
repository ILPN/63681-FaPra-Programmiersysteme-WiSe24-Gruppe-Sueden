import {DirectlyFollows} from "../directly-follows";
import {Node} from "./node";
/**
 * Represents a node in a Directed Flow Graph (DFG). It extends the basic `Node` interface
 * with a `DirectlyFollows` object, which models the direct relationships between nodes
 * in the flow graph.
 *
 * @interface DfgNode
 * @extends Node
 *
 * @property {DirectlyFollows} dfg - The DirectlyFollows object associated with the node,
 *                                  which defines the direct connections (successors and predecessors, arcs,..)
 *                                  for this node in the Directly Follows Graph.
 */
export interface DfgNode extends Node {
    dfg: DirectlyFollows
}
