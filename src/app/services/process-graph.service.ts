import {Injectable, signal, WritableSignal} from '@angular/core'
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

    logSignal : WritableSignal<string[]> = signal([]);

    graphSignal = signal<ProcessGraph | null>(null)

    createGraph(eventLog: string[][]) {
        // Umwandeln des result in ein DFG Objekt
        const directlyFollowsGraph = new DirectlyFollows();
        directlyFollowsGraph.setDFGfromStringArray(eventLog)

        // Erstelle Anfangs Transitionen und Places für das Petrinetz
        const firstPlace: Place = new Place('place_play');
        const playTransition: Transition = new Transition("play");
        const tempPlace1: Place = new Place(this.generateUniqueId('place'));
        const tempPlace2: Place = new Place(this.generateUniqueId('place'));
        const lastPlace: Place = new Place('place_stop');
        const stopTransition: Transition = new Transition("stop");
        const placeSet = new Set<Place>;
        const transSet = new Set<Transition>;
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
            dfgSet: new Set<DirectlyFollows>([directlyFollowsGraph]),
            places: placeSet,
            transitions: transSet,
            arcs: firstArcs,
        })
        this.addLogEntry(' ')
        this.addLogEntry('Initial Graph generated')
        this.addLogEntry(' ')
    }

    /*==============================================================================================================================*/
    /*====================================================Validation Logic==========================================================*/

    /*==============================================================================================================================*/

    public validateCut(data: ValidationData): ValidationResult {
        // sortiere die Reihenfolge der NodeSets für die spätere Parameterübergabe
        let sortedNodes = ValidationHelper.createSortedNodeSets(data)
        const firstNodeSet = sortedNodes[0];
        const secondNodeSet = sortedNodes[1];
        //Rufe Validierung auf
        const result =
            ValidationHelper.validateAndReturn(data.dfg, firstNodeSet, secondNodeSet, data.cutType, this.addLogEntry.bind(this));

        // Die Ergebnisse an das ProcessGraphService weitergeben

        if (result[0] && result[2] !== undefined && result[3] !== undefined) {
            let firstOptional = false;
            let secondOptional = false;
            if (data.cutType === CutType.SEQUENCE || data.cutType === CutType.PARALLEL) {
                this.addLogEntry("checking if subgraphs optional")
                firstOptional = this.isItOptional(result[2])
                secondOptional = this.isItOptional(result[3]);

                if (firstOptional && secondOptional) {
                    this.addLogEntry('Sequence-Cut successful, both subgraphs optional');
                    result[1] = 'Sequence-Cut successful, both subgraphs optional';
                }
                if (firstOptional) {
                    this.addLogEntry('Sequence-Cut successful, first subgraph optional');
                    result[1] = 'Sequence-Cut successful, first subgraph optional';
                }
                if (secondOptional) {
                    this.addLogEntry('Sequence-Cut successful, second subgraph optional');
                    result[1] = 'Sequence-Cut successful, second subgraph optional';
                }
                this.addLogEntry("no subgraph optional")
            }
            if (result[2] && result[3]) {
                this.addLogEntry("incorporating new DFGs into Petrinet")
                this.incorporateNewDFGs(data.dfg, result[2], firstOptional, result[3], secondOptional, data.cutType);
            }
            const currentGraph = this.graphSignal();
            if (currentGraph) {
                this.graphSignal.set({
                    ...currentGraph,
                    /* Entferne validationSuccessful oder passe an */
                });
            }
        }
        this.addLogEntry(" ")
        return {success: result[0], comment: result[1]};
    }

    // nimmt 3 dfg 2 bool und die cut method entgegen - updated dementsprechend den Processgraph am Signal
    incorporateNewDFGs(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                       dfg1: DirectlyFollows, isOptional1: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                       dfg2: DirectlyFollows, isOptional2: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                       cutMethod: CutType) {                        // cutmethode
        const currentGraph = this.graphSignal();
        if (!currentGraph) {
            throw new Error("No ProcessGraph found in the Graph Signal!");
        }
        //Setze ID der dfg
        dfg1.setID(dfgOriginal.id);
        dfg2.setID(currentGraph.dfgSet.size);
        switch (cutMethod) {
            case CutType.XOR:
                this.incorporateXor(dfgOriginal, dfg1, dfg2, currentGraph);
                this.addLogEntry("Xor-Cut successfully executed")
                break
            case CutType.SEQUENCE:
                this.incorporateSequence(dfgOriginal, dfg1, isOptional1, dfg2, isOptional2, currentGraph);
                this.addLogEntry("Sequence-Cut successfully executed")
                break
            case CutType.PARALLEL:
                this.incorporateParallel(dfgOriginal, dfg1, isOptional1, dfg2, isOptional2, currentGraph);
                this.addLogEntry("Parallel-Cut  successfully executed")

                break
            case CutType.LOOP:
                this.incorporateLoop(dfgOriginal, dfg1, dfg2, currentGraph);
                this.addLogEntry("Loop-Cut  successfully executed")
                break
            default:
                throw new Error("No Cut-Type provided")
        }
    }

    /*==============================================================================================================================*/

    //XOR

    private incorporateXor(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                           dfg1: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                           dfg2: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                           workingGraph: ProcessGraph) {
        //flatMap durchläuft alle arcs und ersetzt sie nach gegebenen Kriterien
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
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/

    //Sequence

    private incorporateSequence(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                                dfg1: DirectlyFollows, isOptional1: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                dfg2: DirectlyFollows, isOptional2: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                workingGraph: ProcessGraph) {
        const middlePlace: Place = new Place(this.generateUniqueId('place'));
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
        //macht dfgs optional (siehe skript)
        this.addLogEntry('creating silent transitions')
        if (isOptional1) {
            this.makeOptional(dfg1, workingGraph)
        }
        if (isOptional2) {
            this.makeOptional(dfg2, workingGraph)
        }
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/

    //Parallel

    private incorporateParallel(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                                dfg1: DirectlyFollows, isOptional1: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                dfg2: DirectlyFollows, isOptional2: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                workingGraph: ProcessGraph) {
        //Erstelle neue Places
        const firstPlaceNew1: Place = new Place(this.generateUniqueId('place'));
        workingGraph.places.add(firstPlaceNew1);
        const lastPlaceNew1: Place = new Place(this.generateUniqueId('place'));
        workingGraph.places.add(lastPlaceNew1);
        // Erstelle boolen um zu checken ob Tau transitionen nötig
        let firstTauNeeded = true;
        let lastTauNeeded = true;
        //falls dfgOriginal nur 2 mal in arcs vorkommt, ist er nur mit zwei stellen (1 davor 1 danach) verbunden
        if (this.occursInThisManyArcs(workingGraph.arcs, dfgOriginal, 2).underThreshold) {
            workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
                //geh alle arcs durch und suche die stelle vor dem dfgOriginal // checke ob stelle nur mit einer transition verbunden ist und nur 2 kanten hat
                //falls das der Fall ist, ist keine Tau transition davor benötigt
                if (arc.target === dfgOriginal && this.occursInThisManyArcs(workingGraph.arcs, arc.source, 2).underThreshold) {
                    firstTauNeeded = false;
                    //Finde transition VOR place
                    let transitionOrDFGbefore = this.findSingularSourceForTarget(workingGraph.arcs, arc.source);
                    // tausche dfg original mit dfg1
                    return [{source: arc.source, target: dfg1},
                        {source: transitionOrDFGbefore, target: firstPlaceNew1},
                        {source: firstPlaceNew1, target: dfg2}];
                }
                //geh alle arcs durch und suche die stelle nach dem dfgOriginal // checke ob stelle nur mit einer transition verbunden ist und nur 2 kanten hat
                //falls das der Fall ist, ist keine Tau transition danach benötigt
                if (arc.source === dfgOriginal && this.occursInThisManyArcs(workingGraph.arcs, arc.target, 2).underThreshold) {
                    lastTauNeeded = false;
                    //Finde transition NACH place
                    let transitionOrDFGafter = this.findTargetForSource(workingGraph.arcs, arc.target);
                    return [{source: dfg1, target: arc.target},
                        {source: dfg2, target: lastPlaceNew1},
                        {source: lastPlaceNew1, target: transitionOrDFGafter}];
                }
                return arc
            });
        }
        if (firstTauNeeded) {
            const firstPlaceNew2: Place = new Place(this.generateUniqueId('place'));
            workingGraph.places.add(firstPlaceNew2);
            const firstTauTransition: Transition = new Transition(this.generateUniqueId('TAU'));
            workingGraph.transitions.add(firstTauTransition);
            workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
                //geh alle arcs durch und suche die stelle vor dem dfgOriginal
                if (arc.target === dfgOriginal) {
                    // tausche verknüpfung zu DfgOriginal mit verknüpfung zu firstTauTransition
                    return [{source: arc.source, target: firstTauTransition}];
                }
                return arc
            });
            //Erstelle verbindungen zu neuen Stellen
            workingGraph.arcs.push({source: firstTauTransition, target: firstPlaceNew1});
            workingGraph.arcs.push({source: firstTauTransition, target: firstPlaceNew2});
            //Erstelle Verbindungen zu dfgs
            workingGraph.arcs.push({source: firstPlaceNew1, target: dfg1});
            workingGraph.arcs.push({source: firstPlaceNew2, target: dfg2});
        }
        if (lastTauNeeded) {
            const lastPlaceNew2: Place = new Place(this.generateUniqueId('place'));
            workingGraph.places.add(lastPlaceNew2);
            const lastTauTransition: Transition = new Transition(this.generateUniqueId('TAU'));
            workingGraph.transitions.add(lastTauTransition);
            workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
                //suche stelle nach dem dfgOriginal
                if (arc.source === dfgOriginal) {
                    // tausche verknüpfung zu DfgOriginal mit verknüpfung zu lastTauTransition
                    return [{source: lastTauTransition, target: arc.target}];
                }
                // falls dfgOriginal nicht im arc, ändere nichts
                return arc
            });
            //Erstelle verbindungen zu neuen Stellen
            workingGraph.arcs.push({source: lastPlaceNew1, target: lastTauTransition});
            workingGraph.arcs.push({source: lastPlaceNew2, target: lastTauTransition});
            //Erstelle Verbindungen zu dfgs
            workingGraph.arcs.push({source: dfg1, target: lastPlaceNew1});
            workingGraph.arcs.push({source: dfg2, target: lastPlaceNew2});
        }
        if (isOptional1) {
            this.makeOptional(dfg1, workingGraph)
        }
        if (isOptional2) {
            this.makeOptional(dfg2, workingGraph)
        }
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/

    //LOOP

    private incorporateLoop(dfgOriginal: DirectlyFollows,                    // der dfg der ausgetauscht werden soll
                            dfg1: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                            dfg2: DirectlyFollows,                            // dfg1 mit dem ausgetauscht wird
                            workingGraph: ProcessGraph) {

        //check if original dfg has just one source-place and source place has just one outgoing edge
        if (this.occursInThisManyArcsAsTarget(workingGraph.arcs, dfgOriginal, 1).count === 1) {
            let sourcePlace = this.findSingularSourceForTarget(workingGraph.arcs, dfgOriginal)
            let sourceOccurs = this.occursInThisManyArcsAsSource(workingGraph.arcs, sourcePlace, 1)
            let placeHasJustOneFollower: boolean = sourceOccurs.count === 1 && sourceOccurs.underThreshold
            if (placeHasJustOneFollower) {
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
                this.graphSignal.set(workingGraph);
                return;
            }
        }
        // Falls eine Tau transition benötigt wird...
        const newPlace: Place = new Place(this.generateUniqueId('place'));
        workingGraph.places.add(newPlace);
        const newTransition: Transition = new Transition(this.generateUniqueId('TAU'));
        workingGraph.transitions.add(newTransition);
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            // stelle nach dfgOriginal gefunden
            if (arc.source === dfgOriginal) {
                // Füge Kanten dfg1->stelle-> dfg2 ein, lösche kante zu dfgOriginal
                return [{source: dfg1, target: arc.target}, {source: arc.target, target: dfg2}];
            }
            //Stelle vor dfgOriginal
            if (arc.target === dfgOriginal) {

                // Füge Kanten dfg2 -> stelle-> dfg1 ein, lösche kante zu dfgOriginal
                return [{source: arc.source, target: newTransition}, {
                    source: newTransition,
                    target: newPlace
                }, {source: newPlace, target: dfg1}, {source: dfg2, target: newPlace}];
            }
            // Behalte den Arc, falls er nicht ersetzt wird
            return [arc];
        });

        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/
    /*==========================================================BaseCase============================================================*/
    /*==============================================================================================================================*/
    public transformBaseCases(dfgSet: Set<DirectlyFollows>): [boolean, Set<DirectlyFollows>] {
        let workingGraph = this.graphSignal()!;
        let invalidDFGs = new Set<DirectlyFollows>()
        for (let dfg of dfgSet) {
            if (!this.isBaseCase(dfg)) {
                invalidDFGs.add(dfg);
            }
        }
        if (invalidDFGs.size > 0) {
            return [false, invalidDFGs]
        }
        for (let dfg of dfgSet) {
            this.transformBaseCaseToTransition(workingGraph, dfg)
        }
        this.graphSignal.set(workingGraph);
        return [true, invalidDFGs]
    }

    private isBaseCase(dfg: DirectlyFollows): boolean {
        return dfg.getNodes().size === 1 && dfg.arcs.length === 2;
    }

    private transformBaseCaseToTransition(workingGraph: ProcessGraph, dfg: DirectlyFollows) {
        let node: string = dfg.getNodes().values().next().value
        const newTransition = new Transition(node);
        workingGraph.transitions.add(newTransition)
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            // eig. unnötig da davor schon check arc size..
            if (arc.source === dfg && arc.target === dfg) {
                return [{source: newTransition, target: newTransition}];
            }
            if (arc.source === dfg) {
                return [{source: newTransition, target: arc.target}];
            }
            if (arc.target === dfg) {
                return [{source: arc.source, target: newTransition}];
            }
            return [arc]
        });
        workingGraph.dfgSet.delete(dfg)

    }

    /*==============================================================================================================================*/
    /*===============================================FALL THROUGH ENTRY POINT=======================================================*/
    /*==============================================================================================================================*/




    /*======================================METHODEN zur Petrinetz Bearbeitung===========================================*/


    // tauscht einen dfg im dfgset gegen zwei neue übergebene aus
    private exchangeDFGs(dfgOriginal: DirectlyFollows, dfg1: DirectlyFollows, dfg2: DirectlyFollows, workingGraph: ProcessGraph) {
        workingGraph.dfgSet.delete(dfgOriginal);
        workingGraph.dfgSet.add(dfg1);
        workingGraph.dfgSet.add(dfg2);
    }

    // macht einen DFG durch hinzufügen einer TAU-Transition optional
    private makeOptional(dfg: DirectlyFollows, workingGraph: ProcessGraph) {
        const tauTransition: Transition = new Transition(this.generateUniqueId('TAU'));
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

    // checks via eventlog empty trace if dfg is optional
    // if yes return true and delete empty traces from eventlog
    private isItOptional(dfg: DirectlyFollows): boolean {
        if (dfg.eventLog.some(trace => trace.length === 0)) {
            dfg.eventLog = dfg.eventLog.filter(trace => trace.length > 0);
            return true
        }
        return false;
    }

    //schaut wie oft ein node in arcs vorkommt und somit, wie viele kanten mit einem node verbunden sind.
    // es kann auch durch übergabe einer number geprüft werden, ob mehr als x kanten ausgehen...
    private occursInThisManyArcs<T>(arcs: Arc[], node: T, maxCount: number = Infinity): {
        count: number,
        underThreshold: boolean
    } {
        let count = 0;
        for (const arc of arcs) {
            if (arc.source === node || arc.target === node) {
                count++;
                if (count > maxCount) {
                    return {count, underThreshold: false};
                }
            }
        }
        return {count, underThreshold: true};
    }

    private occursInThisManyArcsAsSource<T>(arcs: Arc[], node: T, maxCount: number = Infinity): {
        count: number,
        underThreshold: boolean
    } {
        let count = 0;
        for (const arc of arcs) {
            if (arc.source === node) {
                count++;
                if (count > maxCount) {
                    return {count, underThreshold: false};
                }
            }
        }
        return {count, underThreshold: true};
    }

    private occursInThisManyArcsAsTarget<T>(arcs: Arc[], node: T, maxCount: number = Infinity): {
        count: number,
        underThreshold: boolean
    } {
        let count = 0;
        for (const arc of arcs) {
            if (arc.target === node) {
                count++;
                if (count > maxCount) {
                    return {count, underThreshold: false};
                }
            }
        }
        return {count, underThreshold: true};
    }

//TODO: evtl andere methoden mit Hilfe dieser umschreiben, jedoch nicht so laufzeit effizient...
    private findSources<T>(arcs: Arc[], target: T): (DirectlyFollows | string | Place | Transition)[] {
        return arcs
            .filter(arc => arc.target === target)
            .map(arc => arc.source);
    }

    private findTargets<T>(arcs: Arc[], source: T): (DirectlyFollows | string | Place | Transition)[] {
        return arcs
            .filter(arc => arc.source === source)
            .map(arc => arc.target);
    }

    private findSingularSourceForTarget<T>(arcs: Arc[], target: T): DirectlyFollows | Place | Transition | string {
        for (const arc of arcs) {
            if (arc.target === target) {
                return arc.source; // Return the source if the target matches
            }
        }
        return 'null'; // Return null if no matching target is found
    }

    private findTargetForSource<T>(arcs: Arc[], source: T): DirectlyFollows | Place | Transition | string {
        for (const arc of arcs) {
            if (arc.source === source) {
                return arc.target; // Return the source if the target matches
            }
        }
        return 'null'; // Return null if no matching target is found
    }


    /*======================================Unique IDs===========================================*/
    generateUniqueId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }


    /*======================================Process-Graph-Signal - UPDATE-METHODEN===========================================*/


    updateDfgSet(newDfgSet: Set<DirectlyFollows>): void {
        const currentGraph = this.graphSignal();
        if (currentGraph) {
            // Setze das dfgSet auf das neue Set
            this.graphSignal.set({
                ...currentGraph,
                dfgSet: newDfgSet // Ersetze das vorhandene dfgSet
            });
        }
    }

    updatePlaces(newPlaces: Set<Place>): void {
        const currentGraph = this.graphSignal();
        if (currentGraph) {
            this.graphSignal.set({
                ...currentGraph,
                places: newPlaces // Ersetze das vorhandene Set von Places
            });
        }
    }

    updateTransitions(newTransitions: Set<Transition>): void {
        const currentGraph = this.graphSignal();
        if (currentGraph) {
            this.graphSignal.set({
                ...currentGraph,
                transitions: newTransitions // Ersetze das vorhandene Set von Transitionen
            });
        }
    }

    updateArcs(newArcs: Arc[]): void {
        const currentGraph = this.graphSignal();
        if (currentGraph) {
            this.graphSignal.set({
                ...currentGraph,
                arcs: newArcs // Ersetze das vorhandene Array von Arcs
            });
        }
    }

    getDfgList() {
        return this.graphSignal()?.dfgSet
    }

    /*======================================LOG - UPDATE - METHODEN===========================================*/

    addLogEntry(entry: string): void {
        this.logSignal.update(currentLog => [...currentLog, entry]);
    }

    clearLog(): void {
        this.logSignal.set([]);
    }

    getLog(): WritableSignal<string[]> {
        return this.logSignal;
    }
}
