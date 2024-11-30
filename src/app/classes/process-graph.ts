import {DirectlyFollows} from './directly-follows'
import {Arc} from "./arc";
import {Place} from "./graph/place";
import {Transition} from "./graph/transition";


//TODO: Gibt bis jetzt nur die DFGs ohne verknüpfungen usw. muss noch angepasst werden
export interface ProcessGraph {
    validationSuccessful: boolean
    reason: string | null
    dfgSet: Set<DirectlyFollows>
    places: Set<Place>;
    transitions: Set<Transition>;
    arcs : Arc[];
    dataUpdated: boolean;
}
