import {Injectable, signal} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraph} from "../classes/process-graph"
import {Place} from "../classes/graph/place";
import {Transition} from "../classes/graph/transition";
import {Arc} from "../classes/arc";
import {CutType} from "../classes/cut-type.enum";
import {ValidationResult} from '../classes/validation-result';
import {ValidationData} from "../classes/validation-data";
import {ValidationHelper} from "../helper/ValidationHelper";


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
        const placeSet= new Set<Place>;
        const transSet= new Set<Transition>;
        placeSet.add(firstPlace);
        placeSet.add(tempPlace1);
        placeSet.add(tempPlace2);
        placeSet.add(lastPlace);
        transSet.add(playTransition);
        transSet.add(stopTransition);


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
            places: placeSet,
            transitions: transSet,
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

    getDfgList() {
        return this.graphSignal()?.dfgSet
    }

    generateUniqueId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    public validateCut(data: ValidationData): ValidationResult {
        // sortiere die Reihenfolge der NodeSets für die spätere Parameterübergabe
        let sortedNodes = ValidationHelper.createSortedNodeSets(data)
        const firstNodeSet = sortedNodes[0];
        const secondNodeSet = sortedNodes[1];
        //Rufe Validierung auf
        const result = ValidationHelper.validateAndReturn(data.dfg, firstNodeSet, secondNodeSet, data.cutType);
        // Die Ergebnisse an das ProcessGraphService weitergeben

        if (result[0]) {
            let firstOptional = false;
            let secondOptional = false;
            if (data.cutType === CutType.SEQUENCE) {
                firstOptional = data.dfg.existsPath(new Set<string>(['play']), secondNodeSet);
                secondOptional = data.dfg.existsPath(firstNodeSet, new Set<string>(['stop']));
                if (firstOptional && secondOptional) {
                    result[1] = 'Sequence-Cut erfolgreich, beide Teilgraphen optional';
                }
                if (firstOptional) {
                    result[1] = 'Sequence-Cut erfolgreich, erster Teilgraph optional';
                }
                if (secondOptional) {
                    result[1] = 'Sequence-Cut erfolgreich, zweiter Teilgraph optional';
                }
            }
            if (result[2] && result[3]) {
                this.incorporateNewDFGs(data.dfg, result[2], firstOptional, result[3], secondOptional, data.cutType);
            }
        }
        //TODO: Eigentlich unnötig --> ich lasse es momentan noch, falls wir doch darauf wechseln wollen.
        this.updateValidationSuccessful(result[0]);  // update validation successful
        this.updateReason(result[1]);               // update reason


        return {validationSuccessful: result[0], comment: result[1]};
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
        //Erstelle neue Stellen und Tau Transitionen
        const firstPlaceNew1: Place = {id: this.generateUniqueId('place')};
        workingGraph.places.add(firstPlaceNew1);
        const firstPlaceNew2: Place = {id: this.generateUniqueId('place')};
        workingGraph.places.add(firstPlaceNew2);
        const firstTauTransition: Transition = {id: this.generateUniqueId('TAU')};
        workingGraph.transitions.add(firstTauTransition);

        const lastPlaceNew1: Place = {id: this.generateUniqueId('place')};
        workingGraph.places.add(firstPlaceNew1);
        const lastPlaceNew2: Place = {id: this.generateUniqueId('place')};
        workingGraph.places.add(firstPlaceNew2);
        const lastTauTransition: Transition = {id: this.generateUniqueId('TAU')};
        workingGraph.transitions.add(firstTauTransition);

        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            //geh alle arcs durch und suche die stelle vor dem dfgOriginal
            if (arc.target === dfgOriginal) {
                // tausche verknüpfung zu DfgOriginal mit verknüpfung zu firstTauTransition
                return [{source: arc.source, target: firstTauTransition}];
            }
            //suche stelle nach dem dfgOriginal
            if (arc.source === dfgOriginal) {
                // tausche verknüpfung zu DfgOriginal mit verknüpfung zu lastTauTransition
                return [{source: lastTauTransition, target: arc.target}];
            }
            // falls dfgOriginal nicht im arc, ändere nichts
            return arc
        });
        //Erstelle verbindungen zu neuen Stellen
        workingGraph.arcs.push({source: firstTauTransition, target: firstPlaceNew1});
        workingGraph.arcs.push({source: firstTauTransition, target: firstPlaceNew2});
        workingGraph.arcs.push({source: lastPlaceNew1, target: lastTauTransition});
        workingGraph.arcs.push({source: lastPlaceNew2, target: lastTauTransition});
        //Erstelle Verbindungen zu dfgs
        workingGraph.arcs.push({source: firstPlaceNew1, target: dfg1});
        workingGraph.arcs.push({source: firstPlaceNew2, target: dfg2});
        workingGraph.arcs.push({source: dfg1, target: lastPlaceNew1});
        workingGraph.arcs.push({source: dfg2, target: lastPlaceNew2});
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


