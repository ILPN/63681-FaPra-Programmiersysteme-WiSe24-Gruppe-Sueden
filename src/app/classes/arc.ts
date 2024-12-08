import {DirectlyFollows} from "./directly-follows";
import {Place} from "./graph/place";
import {Transition} from "./graph/transition";

export interface Arc {
    source: DirectlyFollows | string | Place | Transition;
    target: DirectlyFollows | string | Place | Transition;
}
