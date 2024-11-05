import {DirectlyFollows} from './directly-follows'


//TODO: Gibt bis jetzt nur die DFGs ohne verknüpfungen usw. muss noch angepasst werden
export interface ProcessGraph {
    validationSuccessful: boolean
    reason: string | null
    dfgSet: Set<DirectlyFollows>
}
