import {CutType} from "./cut-type.enum";
import {DfgNode} from "./graph/dfg-node"

/**
 * Represents the data required for validation within the context of a Directed Flow Graph (DFG).
 * This includes the `dfg` node, a set of nodes, and the type of cut
 * (represented by `CutType`) that needs to be applied during validation.
 *
 * @interface ValidationData
 *
 * @property {DfgNode} dfg - The Directed Flow Graph (DFG) node that contains information about the node
 *                             and its direct successors and predecessors.
 *
 * @property {Set<string>} nodeSet - A set of strings representing nodes
 *
 * @property {CutType} cutType - The type of cut (from the `CutType` enum) that specifies how the graph
 *                               should be split or analyzed during the validation process.
 */
export interface ValidationData {
    dfg: DfgNode
    nodeSet: Set<string>
    cutType: CutType
}
