import {Injectable, signal} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraph} from "../classes/process-graph"
import {Place} from "../classes/graph/place";
import {Transition} from "../classes/graph/transition";
import {Arc} from "../classes/arc";


@Injectable({
    providedIn: 'root'
})
export class ProcessGraphService {

    graphSignal = signal<ProcessGraph | null>(null)

    createGraph(eventLog: string[][]) {
        // Umwandeln des result in ein DFG Objekt
        const directlyFollowsGraph = new DirectlyFollows();
        directlyFollowsGraph.setDFGfromStringArray(eventLog)

        // Erstelle Transitionen und Places für das Petrinetz
        const firstPlace: Place = { id: this.generateUniqueId('place')};
        const playTransition : Transition ={ id: "play"};
        const tempPlace1: Place = { id: this.generateUniqueId('place')};
        const tempPlace2: Place = { id: this.generateUniqueId('place')};
        const lastPlace: Place = { id: this.generateUniqueId('place')};
        const stopTransition : Transition ={ id: "stop"};

        const arcs: Arc[] = [
            { source: firstPlace, target: playTransition },
            { source: playTransition, target: tempPlace1 },
            { source: tempPlace1, target: directlyFollowsGraph },
            { source: directlyFollowsGraph, target: tempPlace2 },
            { source: tempPlace2, target: stopTransition },
            { source: stopTransition, target: lastPlace },
        ];


        this.graphSignal.set({
            validationSuccessful: false,
            reason: null,
            dfgSet: new Set<DirectlyFollows>([directlyFollowsGraph]),
            places: new Set<Place>,
            transitions: new Set<Transition>,
            arcs: arcs,
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

    batchUpdateProcessGraph(updates: (graph: ProcessGraph) => void) {
        const currentGraph = this.graphSignal();  // Schritt 1
        if (currentGraph) {  // Schritt 2
            const updatedGraph = { ...currentGraph };  // Schritt 3
            updates(updatedGraph);  // Schritt 4
            this.graphSignal.set(updatedGraph);  // Schritt 5
        }
    }

    generateUniqueId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }


}


//TODO: Gesamten Aufbau des results überdenken
/* brauche: boolean (ob letzter cut geklappt), string (Begründung), die neue Menge an DFGs sowie Pertinetz-Teilen*/
