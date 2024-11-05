import {DirectlyFollows} from './directly-follows'
import {Arc} from "./arc";


//TODO: Gibt bis jetzt nur die DFGs ohne verknüpfungen usw. muss noch angepasst werden
export interface ProcessGraph {
    validationSuccessful: boolean
    reason: string | null
    dfgSet: Set<DirectlyFollows>
    places: Set<string>;
    transitions: Set<string>;
    arcs : Arc[];
}
