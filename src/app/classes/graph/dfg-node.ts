import {DirectlyFollows} from "../directly-follows";
import {Node} from "./node";

export interface DfgNode extends Node {
    dfg: DirectlyFollows
}
