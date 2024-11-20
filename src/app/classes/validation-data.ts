import {DirectlyFollows} from './directly-follows'
import {CutType} from "./cut-type.enum";

export interface ValidationData {
    dfg: DirectlyFollows
    firstNodeSet: Set<string>
    secondNodeSet: Set<string>
    cutType: CutType
}
