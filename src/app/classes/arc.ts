import {DirectlyFollows} from "./directly-follows";

export interface Arc {
    source: DirectlyFollows | string;
    target: DirectlyFollows | string;
}
