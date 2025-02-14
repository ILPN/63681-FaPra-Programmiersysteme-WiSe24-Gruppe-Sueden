import {Node} from "./graph/node";

/**
 * Represents an Arc (directed edge) between two nodes in a graph.
 * An Arc connects a source node to a target node.
 * The source and target can either be node identifiers (strings) or Node objects.
 *
 * @interface Arc
 *
 * @property {string | Node} source - The source node of the arc. This can either be a node identifier (string) or a Node object.
 * @property {string | Node} target - The target node of the arc. This can either be a node identifier (string) or a Node object.
 */
 export interface Arc {
    source: string | Node;
    target: string | Node;
}
