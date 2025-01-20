import {Node} from "./graph/node";

export interface Arc {
    source: string | Node;
    target: string | Node;
}
