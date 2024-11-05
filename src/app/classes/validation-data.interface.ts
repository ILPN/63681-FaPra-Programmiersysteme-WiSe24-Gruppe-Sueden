import {DirectlyFollows} from './directly-follows';

export interface ValidationData {
    dfg: DirectlyFollows;
    firstNodeSet: Set<string>;
    secondNodeSet: Set<string>;
    cutType: string;
}
