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

    graphSignal = signal<ProcessGraph | null>(null)

    createGraph(eventLog: string[][]) {
        // Umwandeln des result in ein DFG Objekt
        const directlyFollowsGraph = new DirectlyFollows();
        directlyFollowsGraph.setDFGfromStringArray(eventLog)

        // Erstelle Anfangs Transitionen und Places für das Petrinetz
        const firstPlace: Place = {id: this.generateUniqueId('place')};
        const playTransition: Transition = {id: "play"};
        const tempPlace1: Place = {id: this.generateUniqueId('place')};
        const tempPlace2: Place = {id: this.generateUniqueId('place')};
        const lastPlace: Place = {id: this.generateUniqueId('place')};
        const stopTransition: Transition = {id: "stop"};

        // Erstelle Arcs
        const firstArcs: Arc[] = [
            {source: firstPlace, target: playTransition},
            {source: playTransition, target: tempPlace1},
            {source: tempPlace1, target: directlyFollowsGraph},
            {source: directlyFollowsGraph, target: tempPlace2},
            {source: tempPlace2, target: stopTransition},
            {source: stopTransition, target: lastPlace},
        ];

        this.graphSignal.set({
            validationSuccessful: false,
            reason: null,
            dfgSet: new Set<DirectlyFollows>([directlyFollowsGraph]),
            places: new Set<Place>,
            transitions: new Set<Transition>,
            arcs: firstArcs,
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

    getDfgList(){
        return this.graphSignal()?.dfgSet
    }

    batchUpdateProcessGraph(updates: () => void) {
        const currentGraph = this.graphSignal();  // Rufe das aktuelle Process-Graph-Objekt ab
        if (currentGraph) {  //wenn es existiert
            const updatedGraph = {...currentGraph};  //erstelle Kopie
            updates();  // führe updates an Kopie durch
            this.graphSignal.set(updatedGraph);  //aktualisiere Signal auf das upgedatete Process-Graph-Objekt
        }
    }

    generateUniqueId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    // nimmt 3 dfg 2 bool und die cut method entgegen - updated dementsprechend den Processgraph am Signal
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
                this.incorporateXor(dfgOriginal, dfg1, dfg2, currentGraph);
                break
            case CutType.SEQUENCE:
                this.incorporateSequence(dfgOriginal, dfg1, isOptional1, dfg2, isOptional2, currentGraph);
                break
            case CutType.PARALLEL:
                this.incorporateParallel(dfgOriginal, dfg1, dfg2, currentGraph);
                break
            case CutType.LOOP:
                this.incorporateLoop(dfgOriginal, dfg1, dfg2, currentGraph);
                break
            default:
                throw new Error("Kein Cut-Type übergeben")
        }
    }

    /*==============================================================================================================================*/
    //XOR
    /*==============================================================================================================================*/
    private incorporateXor(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                           dfg1: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                           dfg2: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                           workingGraph: ProcessGraph) {
        //flatMap durchläuft alle arcs und ersetzt sie nach bestimmten Kriterien
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
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
        // lösche dfgOriginal aus dfgSet, füge dfg1 und dfg2 hinzu
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
    }

    /*==============================================================================================================================*/
    //Sequence
    /*==============================================================================================================================*/
    private incorporateSequence(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                                dfg1: DirectlyFollows, isOptional1: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                dfg2: DirectlyFollows, isOptional2: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                workingGraph: ProcessGraph) {
        const middlePlace: Place = {id: this.generateUniqueId('place')};
        //middlePlace ist die stelle zwischen dfg1 und dfg2
        workingGraph.places.add(middlePlace);
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
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
            this.makeOptional(dfg1, workingGraph)
        }
        if (isOptional2) {
            this.makeOptional(dfg2, workingGraph)
        }
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
    }

    /*==============================================================================================================================*/
    //Parallel
    /*==============================================================================================================================*/
    private incorporateParallel(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                                dfg1: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                                dfg2: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                                workingGraph: ProcessGraph) {
        const firstPlaceNew: Place = {id: this.generateUniqueId('place')};
        const lastPlaceNew: Place = {id: this.generateUniqueId('place')};
        workingGraph.places.add(firstPlaceNew);
        workingGraph.places.add(lastPlaceNew);
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            //geh alle arcs durch und suche die stelle vor dem dfgOriginal
            if (arc.target === dfgOriginal) {
                //suche die Transition(en) bzw. dfg vor der Stelle und verlinke mit firstPlaceNew
                workingGraph.arcs.forEach(arc2 => {
                    if (arc2.target === arc.source) {
                        workingGraph.arcs.push({source: arc2.source, target: firstPlaceNew});
                    }
                });
                // tausche dfgOriginal mit dfg1 in arcs
                return [{source: arc.source, target: dfg1}]
            }
            //füge verlinkung firstPlaceNew zu dfg2 in arcs ein
            workingGraph.arcs.push({source: firstPlaceNew, target: dfg2});
            //suche stelle nach dem dfgOriginal
            if (arc.source === dfgOriginal) {
                //suche die Transition(en) bzw. dfg nach der Stelle und verlinke mit lastPlaceNew
                workingGraph.arcs.forEach(arc2 => {
                    if (arc2.source === arc.target) {
                        //arc2.target ist die transition nach der stelle...
                        workingGraph.arcs.push({source: lastPlaceNew, target: arc2.target});
                    }
                });
                // tausche dfgOriginal mit dfg1 in arcs
                return [{source: dfg1, target: arc.target}];
            }
            //füge verlinkung firstPlaceNew zu dfg2 in arcs ein
            workingGraph.arcs.push({source: dfg2, target: firstPlaceNew});
            // falls dfgOriginal nicht im arc, ändere nichts
            return arc
        });
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
    }

    /*==============================================================================================================================*/
    //LOOP
    /*==============================================================================================================================*/
    private incorporateLoop(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                            dfg1: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                            dfg2: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                            workingGraph: ProcessGraph) {
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            // stelle nach dfgOriginal gefunden
            if (arc.source === dfgOriginal) {
                // Füge Kanten dfg1->stelle-> dfg2 ein, lösche kante zu dfgOriginal
                return [{source: dfg1, target: arc.target}, {source: arc.target, target: dfg2}];
            }
            //Stelle vor dfgOriginal
            if (arc.target === dfgOriginal) {
                // Füge Kanten dfg2 -> stelle-> dfg1 ein, lösche kante zu dfgOriginal
                return [{source: arc.source, target: dfg1}, {source: dfg2, target: arc.source}];
            }
            // Behalte den Arc, falls er nicht ersetzt wird
            return [arc];
        });
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
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
            if (arc.source === dfg) {
                workingGraph.arcs.push({source: tauTransition, target: arc.target});
            }
            if (arc.target === dfg) {
                workingGraph.arcs.push({source: arc.source, target: tauTransition});
            }
        });
    }
}


