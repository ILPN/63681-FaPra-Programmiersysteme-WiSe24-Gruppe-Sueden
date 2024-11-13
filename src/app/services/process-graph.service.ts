import {Injectable, signal} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraph} from "../classes/process-graph"

@Injectable({
    providedIn: 'root'
})
export class ProcessGraphService {

    graphSignal = signal<ProcessGraph | null>(null)

    createGraph(eventLog: string[][]) {
        // Umwandeln des result in ein DFG Objekt
        let directlyFollowsGraph = new DirectlyFollows();
        directlyFollowsGraph.setDFGfromStringArray(eventLog)

        this.graphSignal.set({
            validationSuccessful: false,
            reason: null,
            dfgSet: new Set<DirectlyFollows>([directlyFollowsGraph]),
            places: new Set<string>,
            transitions: new Set<string>,
            arcs: [],
            dataUpdated: false,
        })
    }

    updateValidationSuccessful(validationSuccessful: boolean) {
        this.graphSignal.update(graph => ({
            ...graph!,
            validationSuccessful
        }))
    }

    updateReason(reason: string | null) {
        this.graphSignal.update(graph => ({
            ...graph!,
            reason
        }))
    }

    addDfg(dfg: DirectlyFollows) {
        /*this.graphSignal.update(graph => ({
            ...graph!,
            dfgSet: graph?.dfgSet
            validationSuccessful: successful
        })) TODO warten auf Set entscheidung*/
    }

    removeDfg(dfg: DirectlyFollows) {
        /*this.processGraph.dfgSet.delete(dfg)
        this.resultSubject.next(this.processGraph)*/
    }

    setDataUpdated(boo: boolean): void {
        /*this.processGraph.dataUpdated = boo;*/
    }

    getDataUpdated(): boolean {
        return false/*this.processGraph.dataUpdated;*/
    }
}


//TODO: Gesamten Aufbau des results überdenken
/* brauche: boolean (ob letzter cut geklappt), string (Begründung), die neue Menge an DFGs sowie Pertinetz-Teilen*/
