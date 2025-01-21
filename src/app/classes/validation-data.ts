import {CutType} from "./cut-type.enum";
import {DfgNode} from "./graph/dfg-node"

export interface ValidationData {
    dfg: DfgNode
    firstNodeSet: Set<string>
    cutType: CutType
}
