import {Injectable, signal} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraph} from "../classes/process-graph"
import {Place} from "../classes/graph/place";
import {Transition} from "../classes/graph/transition";
import {Arc} from "../classes/arc";
import {CutType} from "../classes/cut-type.enum";


@Injectable({
    providedIn: 'root'
})
export class ProcessGraphService {
    private successorMap = new Map<DirectlyFollows, Arc[]>();
    private predecessorMap = new Map<DirectlyFollows, Arc[]>();

    graphSignal = signal<ProcessGraph | null>(null)

    createGraph(eventLog: string[][]) {
        // Umwandeln des result in ein DFG Objekt
        const directlyFollowsGraph = new DirectlyFollows();
        directlyFollowsGraph.setDFGfromStringArray(eventLog)

        // Erstelle Transitionen und Places für das Petrinetz
        const firstPlace: Place = {id: this.generateUniqueId('place')};
        const playTransition: Transition = {id: "play"};
        const tempPlace1: Place = {id: this.generateUniqueId('place')};
        const tempPlace2: Place = {id: this.generateUniqueId('place')};
        const lastPlace: Place = {id: this.generateUniqueId('place')};
        const stopTransition: Transition = {id: "stop"};

        const firstArcs: Arc[] = [
            {source: firstPlace, target: playTransition},
            {source: playTransition, target: tempPlace1},
            {source: tempPlace1, target: directlyFollowsGraph},
            {source: directlyFollowsGraph, target: tempPlace2},
            {source: tempPlace2, target: stopTransition},
            {source: stopTransition, target: lastPlace},
        ];
        this.updateArcMaps();


        this.graphSignal.set({
            validationSuccessful: false,
            reason: null,
            dfgSet: new Set<DirectlyFollows>([directlyFollowsGraph]),
            places: new Set<Place>,
            transitions: new Set<Transition>,
            arcs: firstArcs,
        })
    }

    // löscht die aktuelle successorMap und predecessorMap und updated sie auf den aktuellen Zustand
    updateArcMaps() {
        const currentGraph = this.graphSignal();
        if (!currentGraph) {
            throw new Error("Kein ProcessGraph im Graph Signal vorhanden!");
        }
        this.successorMap.clear();
        this.predecessorMap.clear();
        for (const arc of currentGraph.arcs) {
            if (arc.source instanceof DirectlyFollows) {
                if (!this.successorMap.has(arc.source)) {
                    this.successorMap.set(arc.source, []);
                }
                this.successorMap.get(arc.source)!.push(arc);
            }
            if (arc.target instanceof DirectlyFollows) {
                if (!this.predecessorMap.has(arc.target)) {
                    this.predecessorMap.set(arc.target, []);
                }
                this.predecessorMap.get(arc.target)!.push(arc);
            }
        }
    }

    getSuccessorArcs(dfg: DirectlyFollows): Arc[] {
        return this.successorMap.get(dfg) || [];
    }

    getPredecessorArcs(dfg: DirectlyFollows): Arc[] {
        return this.predecessorMap.get(dfg) || [];
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
        const currentGraph = this.graphSignal();  // Rufe das aktuelle Process-Graph-Objekt ab
        if (currentGraph) {  //wenn es existiert
            const updatedGraph = {...currentGraph};  //erstelle Kopie
            updates(updatedGraph);  // führe updates an Kopie durch
            this.graphSignal.set(updatedGraph);  //aktualisiere Signal auf das upgedatete Process-Graph-Objekt
        }
    }

    generateUniqueId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    // nimmt 3 dfg 2 bool und die cut method entgegen - updated dementsprechen den Processgrap am Signal
    incorporateNewDFGs(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                       dfg1: DirectlyFollows, isOptional1: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                       dfg2: DirectlyFollows, isOptional2: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                       cutMethod: CutType) {                        // cutmethode
        const currentGraph = this.graphSignal();
        if (!currentGraph) {
            throw new Error("Kein ProcessGraph im Graph Signal vorhanden!");
        }
        switch (cutMethod) {
            case CutType.XOR:
                //flatMap durchläuft alle arcs und ersetzt sie nach bestimmten Kriterien
                currentGraph.arcs = currentGraph.arcs.flatMap(arc => {
                    //Kriterium = source = originalDFG
                    if (arc.source === dfgOriginal) {
                        const newArc1 = {source: dfg1, target: arc.target};
                        const newArc2 = {source: dfg2, target: arc.target};
                        return [newArc1, newArc2];
                    }
                    if (arc.target === dfgOriginal) {
                        const newArc1 = {source: arc.source, target: dfg1};
                        const newArc2 = {source: arc.source, target: dfg2};
                        return [newArc1, newArc2];
                    }
                    // Behalte den Arc, falls er nicht ersetzt wird
                    return [arc];
                });
                this.exchangeDFGs(dfgOriginal, dfg1, dfg2, currentGraph)
                break
            case CutType.SEQUENCE:
                const middlePlace: Place = {id: this.generateUniqueId('place')};
                //middlePlace ist die stelle zwischen dfg1 und dfg2
                currentGraph.places.add(middlePlace);
                currentGraph.arcs = currentGraph.arcs.flatMap(arc => {
                    // wenn target original DFG war, ersetze mit DFG 1, erstelle neuen arc dfg1 -> middlePlace
                    if (arc.target === dfgOriginal) {
                        const newArc1 = {source: arc.source, target: dfg1};
                        const newArc2 = {source: dfg1, target: middlePlace}
                        return [newArc1, newArc2];
                    }
                    // wenn target original DFG war, ersetze mit DFG 1, erstelle neuen arc dfg1 -> middlePlace
                    if (arc.source === dfgOriginal) {
                        const newArc1 = {source: dfg2, target: arc.target};
                        const newArc2 = {source: middlePlace, target: dfg2}
                        return [newArc1, newArc2];
                    }
                    return [arc];
                });
                //TODO: evtl nicht nötig, falls wir TAU-Übergänge noch in den DFG nehmen
                //macht dfgs optional (siehe skript)
                if (isOptional1) {
                    this.makeOptional(dfg1, currentGraph)
                }
                if (isOptional2) {
                    this.makeOptional(dfg2, currentGraph)
                }
                this.exchangeDFGs(dfgOriginal, dfg1, dfg2, currentGraph)
                break
            case CutType.PARALLEL:
                /*
                Pseudocode:
                eingabe : dfgOriginal (der zu ersetzende), dfg1, dfg2 (dfg1 ist do, dfg2 ist redo)
                stelleStart =  stelle vor dfgOriginal
                stelleEnd =  stelle nach dfgOriginal
                ersetze dfgOriginal mit dfg1
                verlinke stelleEnd mit dfg2
                verlinke dfg2 mit stelleStart
                ersetze dfgOriginal mit dfg1
                lösche verweise auf dfgOriginal in dfgSet
                erstelle verweise auf dfg1 und dfg2 in dfgSet
                 */
                break
            case CutType.LOOP:
                /*
                Pseudocode:
                eingabe : dfgOriginal (der zu ersetzende), dfg1, dfg2 (dfg1 ist do, dfg2 ist redo)
                stelleStart =  stelle vor dfgOriginal
                stelleEnd =  stelle nach dfgOriginal
                ersetze dfgOriginal mit dfg1
                verlinke stelleEnd mit dfg2
                verlinke dfg2 mit stelleStart
                ersetze dfgOriginal mit dfg1
                lösche verweise auf dfgOriginal in dfgSet
                erstelle verweise auf dfg1 und dfg2 in dfgSet
                 */
                break
            default:
                throw new Error("Kein Cut-Type übergeben")

        }

    }

    // tauscht einen dfg im dfgset gegen zwei neue übergebene aus
    private exchangeDFGs(dfgOriginal: DirectlyFollows, dfg1: DirectlyFollows, dfg2: DirectlyFollows, workingGraph: ProcessGraph) {
        workingGraph.dfgSet.delete(dfgOriginal);
        workingGraph.dfgSet.add(dfg1);
        workingGraph.dfgSet.add(dfg2);
    }

    // macht einen DFG durch hinzufügen einer TAU-Transition optional
    private makeOptional(dfg: DirectlyFollows, workingGraph: ProcessGraph) {
        const tauTransition: Transition = {id: this.generateUniqueId('TAU')};
        workingGraph.transitions.add(tauTransition);
        workingGraph.arcs.forEach(arc => {
            if (arc.source === dfg) workingGraph.arcs.push({source: tauTransition, target: arc.target});
            if (arc.target === dfg) workingGraph.arcs.push({source: arc.source, target: tauTransition});
        });
    }
}


//TODO: Gesamten Aufbau des results überdenken
/* brauche: boolean (ob letzter cut geklappt), string (Begründung), die neue Menge an DFGs sowie Pertinetz-Teilen*/
