import {Injectable, signal, WritableSignal} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraph} from "../classes/process-graph"
import {Arc} from "../classes/arc";
import {CutType} from "../classes/cut-type.enum";
import {ValidationResult} from '../classes/validation-result';
import {ValidationData} from "../classes/validation-data";
import {ValidationHelper} from "../helper/ValidationHelper";
import {FallthroughType} from "../classes/fallthrough.enum";
import {FallthroughHelper} from "../helper/FallthroughHelper";
import {NodeType, Node} from "../classes/graph/node";
import {PhysicsHelper} from "../helper/PhysicsHelper";
import {DfgNode} from "../classes/graph/dfg-node";
import {DisplayService} from "./display.service";

@Injectable({
    providedIn: 'root'
})
export class ProcessGraphService {

    logSignal: WritableSignal<string[]> = signal([]);

    graphSignal = signal<ProcessGraph | null>(null)

    constructor(private displayService: DisplayService) {
    }

    createGraph(eventLog: string[][]) {
        // Umwandeln des result in ein DFG Objekt
        const dfg = new DirectlyFollows();
        dfg.setDFGfromStringArray(eventLog)
        const eventlog: DfgNode = this.createEventlog(dfg)

        // Erstelle Anfangs Transitionen und Places für das Petrinetz
        const placeSet = new Set<Node>;
        const transSet = new Set<Node>;
        const firstPlace: Node = this.createPlace('place_play');
        const playTransition: Node = this.createTransition("play");
        const tempPlace1: Node = this.createPlace(this.generateUniqueId('place'));
        const tempPlace2: Node = this.createPlace(this.generateUniqueId('place'));
        const lastPlace: Node = this.createPlace('place_stop');
        const stopTransition: Node = this.createTransition("stop");

        playTransition.x = this.displayService.width() / 6
        playTransition.y = this.displayService.height() / 2

        tempPlace1.x = this.displayService.width() * 2 / 6
        tempPlace1.y = this.displayService.height() / 2

        eventlog.x = this.displayService.width() * 3 / 6
        eventlog.y = this.displayService.height() / 2

        tempPlace2.x = this.displayService.width() * 4 / 6
        tempPlace2.y = this.displayService.height() / 2

        stopTransition.x = this.displayService.width() * 5 / 6
        stopTransition.y = this.displayService.height() / 2


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
            {source: tempPlace1, target: eventlog},
            {source: eventlog, target: tempPlace2},
            {source: tempPlace2, target: stopTransition},
            {source: stopTransition, target: lastPlace},
        ];
        this.graphSignal.set({
            dfgSet: new Set<DfgNode>([eventlog]),
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
        const originalDFG = data.dfg.dfg
        //Rufe Validierung auf
        const result =
            ValidationHelper.validateAndReturn(originalDFG, firstNodeSet, secondNodeSet, data.cutType, this.addLogEntry.bind(this));

        // Die Ergebnisse an das ProcessGraphService weitergeben

        if (result[0] && result[2] !== undefined && result[3] !== undefined) {

            if (result[2] && result[3]) {
                this.addLogEntry("incorporating new DFGs into Petrinet")
                this.incorporateNewDFGs(data.dfg, result[2], result[3], data.cutType);
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
    incorporateNewDFGs(dfgNodeOriginal: DfgNode,                     // der dfg der ausgetauscht werden soll
                       dfg1: DirectlyFollows,                        // dfg1 mit dem ausgetauscht wird
                       dfg2: DirectlyFollows,                        // dfg1 mit dem ausgetauscht wird
                       cutMethod: CutType) {                        // cutmethode
        const currentGraph = this.graphSignal();
        if (!currentGraph) {
            throw new Error("No ProcessGraph found in the Graph Signal!");
        }
        const dfgNode1 = this.createEventlog(dfg1);
        const dfgNode2 = this.createEventlog(dfg2);
        switch (cutMethod) {
            case CutType.XOR:
                this.incorporateXor(dfgNodeOriginal, dfgNode1, dfgNode2, currentGraph);
                this.addLogEntry("Xor-Cut successfully executed")
                break
            case CutType.SEQUENCE:
                this.incorporateSequence(dfgNodeOriginal, dfgNode1, dfgNode2, currentGraph);
                this.addLogEntry("Sequence-Cut successfully executed")
                break
            case CutType.PARALLEL:
                this.incorporateParallel(dfgNodeOriginal, dfgNode1, dfgNode2, currentGraph);
                this.addLogEntry("Parallel-Cut  successfully executed")

                break
            case CutType.LOOP:
                this.incorporateLoop(dfgNodeOriginal, dfgNode1, dfgNode2, currentGraph);
                this.addLogEntry("Loop-Cut  successfully executed")
                break
            default:
                throw new Error("No Cut-Type provided")
        }
    }

    /*==============================================================================================================================*/

    //XOR

    private incorporateXor(dfgOriginal: DfgNode,                    // der dfg der ausgetauscht werden soll
                           dfg1: DfgNode,                            // dfg1 mit dem ausgetauscht wird
                           dfg2: DfgNode,                            // dfg1 mit dem ausgetauscht wird
                           workingGraph: ProcessGraph) {
        //if (dfg1.dfg.eventLog.length===1 && dfg1.dfg.eventLog[0]===[])

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
        dfg1.x = dfgOriginal.x
        dfg1.y = dfgOriginal.y + dfgOriginal.height / 2
        dfg2.x = dfgOriginal.x
        dfg2.y = dfgOriginal.y - dfgOriginal.height / 2
        this.checkAndTransformDFGtoBasecase(dfg1, workingGraph)
        this.checkAndTransformDFGtoBasecase(dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/

    //Sequence

    private incorporateSequence(dfgOriginal: DfgNode,                    // der dfg der ausgetauscht werden soll
                                dfg1: DfgNode, //isOptional1: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                dfg2: DfgNode, //isOptional2: boolean,     // dfg1 mit dem ausgetauscht wird, bool ob optional
                                workingGraph: ProcessGraph) {
        const middlePlace: Node = this.createPlace(this.generateUniqueId('place'));
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
        //TODO: Rausnehmen da über Fallthrough behandlung
        /*
        this.addLogEntry('creating silent transitions')
        if (isOptional1) {
            this.makeOptional(dfg1, workingGraph)
        }
        if (isOptional2) {
            this.makeOptional(dfg2, workingGraph)
        }
        */
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
        middlePlace.x = dfgOriginal.x
        middlePlace.y = dfgOriginal.y
        dfg1.x = dfgOriginal.x - dfgOriginal.width / 2
        dfg1.y = dfgOriginal.y
        dfg2.x = dfgOriginal.x + dfgOriginal.width / 2
        dfg2.y = dfgOriginal.y
        this.checkAndTransformDFGtoBasecase(dfg1, workingGraph)
        this.checkAndTransformDFGtoBasecase(dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/

    //Parallel

    private incorporateParallel(dfgOriginal: DfgNode,                    // der dfg der ausgetauscht werden soll
                                dfg1: DfgNode,    // dfg1 mit dem ausgetauscht wird,
                                dfg2: DfgNode,     // dfg1 mit dem ausgetauscht wird,
                                workingGraph: ProcessGraph) {
        // set x/y of new dfgs
        dfg1.x = dfgOriginal.x
        dfg1.y = dfgOriginal.y + dfgOriginal.height / 2
        dfg2.x = dfgOriginal.x
        dfg2.y = dfgOriginal.y - dfgOriginal.height / 2

        //Erstelle neue Places
        const firstPlaceNew2: Node = this.createPlace(this.generateUniqueId('place'));
        firstPlaceNew2.x = dfg2.x - dfgOriginal.width / 2;
        firstPlaceNew2.y = dfg2.y;
        workingGraph.places.add(firstPlaceNew2);
        const lastPlaceNew2: Node = this.createPlace(this.generateUniqueId('place'));
        lastPlaceNew2.x = dfg2.x + dfgOriginal.width / 2;
        lastPlaceNew2.y = dfg2.y;
        workingGraph.places.add(lastPlaceNew2);
        // Erstelle boolen um zu checken ob Tau transitionen nötig
        let firstTauNeeded = true;
        let lastTauNeeded = true;
        //falls dfgOriginal nur 2 mal in arcs vorkommt, ist er nur mit zwei stellen (1 davor 1 danach) verbunden
        if (this.occursInThisManyArcs(workingGraph.arcs, dfgOriginal, 2).underThreshold) {
            workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
                //geh alle arcs durch und suche die stelle vor dem dfgOriginal // checke ob stelle nur mit einer transition verbunden ist und nur 2 kanten hat
                //falls das der Fall ist, ist keine Tau transition davor benötigt
                if (arc.target === dfgOriginal && this.occursInThisManyArcs(workingGraph.arcs, arc.source as Node, 2).underThreshold) {
                    firstTauNeeded = false;
                    let x = arc.source as Node
                    x.y=dfg1.y
                    x.x = dfgOriginal.x - dfgOriginal.width / 2
                    //Finde transition VOR place
                    let transitionOrDFGbefore = this.findSingularSourceForTarget(workingGraph.arcs, arc.source);
                    // tausche dfg original mit dfg1
                    return [{source: arc.source, target: dfg1},
                        {source: transitionOrDFGbefore, target: firstPlaceNew2},
                        {source: firstPlaceNew2, target: dfg2}];
                }
                //geh alle arcs durch und suche die stelle nach dem dfgOriginal // checke ob stelle nur mit einer transition verbunden ist und nur 2 kanten hat
                //falls das der Fall ist, ist keine Tau transition danach benötigt
                if (arc.source === dfgOriginal && this.occursInThisManyArcs(workingGraph.arcs, arc.target as Node, 2).underThreshold) {
                    lastTauNeeded = false;
                    let x = arc.target as Node
                    x.y = dfg1.y
                    x.x = dfg1.x + dfgOriginal.width / 2
                    //Finde transition NACH place
                    let transitionOrDFGafter = this.findTargetForSource(workingGraph.arcs, arc.target);
                    return [{source: dfg1, target: arc.target},
                        {source: dfg2, target: lastPlaceNew2},
                        {source: lastPlaceNew2, target: transitionOrDFGafter}];
                }
                return arc
            });
        }
        if (firstTauNeeded) {
            const firstPlaceNew1: Node = this.createPlace(this.generateUniqueId('place'));
            firstPlaceNew1.x = dfg1.x - dfgOriginal.width / 2;
            firstPlaceNew1.y = dfg1.y;
            workingGraph.places.add(firstPlaceNew2);
            const firstTauTransition: Node = this.createTransition(this.generateUniqueId('TAU'));
            firstTauTransition.x= firstPlaceNew1.x - PhysicsHelper.placeDiameter
            firstTauTransition.y= dfgOriginal.y
            //TODO: 1 mit 2 vertauschen!!!!!
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
            const lastPlaceNew2: Node = this.createPlace(this.generateUniqueId('place'));
            workingGraph.places.add(lastPlaceNew2);
            const lastTauTransition: Node = this.createTransition(this.generateUniqueId('TAU'));
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
        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
        this.checkAndTransformDFGtoBasecase(dfg1, workingGraph)
        this.checkAndTransformDFGtoBasecase(dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/

    //LOOP

    private incorporateLoop(dfgOriginal: DfgNode,                    // der dfg der ausgetauscht werden soll
                            dfg1: DfgNode,                            // dfg1 mit dem ausgetauscht wird
                            dfg2: DfgNode,                            // dfg1 mit dem ausgetauscht wird
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
                this.checkAndTransformDFGtoBasecase(dfg1, workingGraph)
                this.checkAndTransformDFGtoBasecase(dfg2, workingGraph)
                this.graphSignal.set(workingGraph);
                return;
            }
        }
        // Falls eine Tau transition benötigt wird...
        const newPlace: Node = this.createPlace(this.generateUniqueId('place'));
        workingGraph.places.add(newPlace);
        const newTransition: Node = this.createTransition(this.generateUniqueId('TAU'));
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
        this.checkAndTransformDFGtoBasecase(dfg1, workingGraph)
        this.checkAndTransformDFGtoBasecase(dfg2, workingGraph)
        this.graphSignal.set(workingGraph);
    }

    /*==============================================================================================================================*/
    /*==========================================================BaseCase============================================================*/
    /*==============================================================================================================================*/

    //__Methode um mehrere DFG gleichzeitig zu wandeln
    /*
    private transformMultipleBaseCases(dfgSet: Set<DirectlyFollows>): [boolean, Set<DirectlyFollows>] {
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
    */

    private checkAndTransformDFGtoBasecase(dfg: DfgNode, workingGraph: ProcessGraph): void {
        if (this.isBaseCase(dfg)) {
            this.transformBaseCaseToTransition(workingGraph, dfg)
        }
    }

    //Testet ob es nur einen Eintrag im eventlog gibt (zwecks empty trace), es nur eine node gibt und nur 2 kanten
    //wenn ja, muss es sich um einen base case handeln
    private isBaseCase(dfgNode: DfgNode): boolean {
        let dfg = dfgNode.dfg;
        return dfg.eventLog.length === 1 && dfg.getNodes().size === 1 && dfg.arcs.length === 2;
    }

    private transformBaseCaseToTransition(workingGraph: ProcessGraph, dfgNode: DfgNode) {
        let dfg = dfgNode.dfg;
        let node: string = dfg.getNodes().values().next().value
        let newTransition: Node = this.createTransition('placeholder')
        if (node === undefined) {
            newTransition = this.createTransition(this.generateUniqueId('TAU'));
        } else {
            newTransition = this.createTransition(node);
        }
        newTransition.x = dfgNode.x
        newTransition.y = dfgNode.y
        workingGraph.transitions.add(newTransition)
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            // eig. unnötig da davor schon check arc size..
            if (arc.source === dfgNode && arc.target === dfgNode) {
                return [{source: newTransition, target: newTransition}];
            }
            if (arc.source === dfgNode) {
                return [{source: newTransition, target: arc.target}];
            }
            if (arc.target === dfgNode) {
                return [{source: arc.source, target: newTransition}];
            }
            return [arc]
        });
        workingGraph.dfgSet.delete(dfgNode)

    }

    /*==============================================================================================================================*/
    /*=====================================================FALL THROUGH=============================================================*/

    /*==============================================================================================================================*/

    public validateFallthrough(dfgNode: DfgNode, fallthroughType: FallthroughType, nodeSet: Set<string>): ValidationResult {
        const workingGraph = this.graphSignal();
        if (!workingGraph) {
            throw new Error("No ProcessGraph found in the Graph Signal!");
        }
        switch (fallthroughType) {
            /*=====================================================SPT====================================================*/
            case FallthroughType.SPT: {
                // Check for Empty trace
                this.addLogEntry('Check for empty trace')
                let emptyTrace = dfgNode.dfg.eventLog.some(trace => trace.length === 0);
                let repeatingPattern = dfgNode.dfg.isPatternExclusivelyRepeated()
                if (!repeatingPattern) {
                    return {success: false, comment: 'No repeating Pattern found'}
                }
                if (emptyTrace) {
                    this.addLogEntry('empty trace found, creating TAU-Transition')
                    this.makeOptional(dfgNode, workingGraph)
                    //lösche empty trace
                    dfgNode.dfg.eventLog = dfgNode.dfg.eventLog.filter(trace => trace.length > 0);
                } else {
                    this.addLogEntry('No empty trace found')
                }
                // check for repeating pattern
                this.addLogEntry('Check for repeating pattern')

                // Passe eventlog sowie Arcs an
                let repeatedPattern = dfgNode.dfg.getRepeatedPattern();
                let dfgNew= new DirectlyFollows();
                dfgNew.setDFGfromStringArray([repeatedPattern]);
                dfgNode.dfg = dfgNew;
                dfgNode.dfg.arcs = dfgNode.dfg.arcs.filter(arc =>
                    !(arc.target === repeatedPattern[0] && arc.source === repeatedPattern[repeatedPattern.length - 1])
                );
                this.addLogEntry('repeating pattern found, solving per TAU-Transition')
                if (emptyTrace) { //DFG ist im REDO Part
                    // Drehe Kanten um
                    this.addLogEntry('DFG part of REDO-Part')
                    workingGraph.arcs.forEach(arc => {
                        if (arc.target === dfgNode || arc.source === dfgNode) {
                            [arc.source, arc.target] = [arc.target, arc.source]
                        }
                    })
                } else { //DFG ist im DO Part
                    // Füge Tau Transition als REDO ein
                    this.addLogEntry('DFG part of DO-Part')
                    const tauTransition: Node = this.createTransition(this.generateUniqueId('TAU'))
                    workingGraph.transitions.add(tauTransition);
                    workingGraph.arcs.forEach(arc => {
                        if (arc.target === dfgNode) {
                            workingGraph.arcs.push({source: tauTransition, target: arc.source})
                        }
                        if (arc.source === dfgNode) {
                            workingGraph.arcs.push({source: arc.target, target: tauTransition})
                        }
                    })
                }
                this.addLogEntry('Solved per TAU-Transition')
                this.checkAndTransformDFGtoBasecase(dfgNode, workingGraph)
                this.graphSignal.set({
                    ...workingGraph
                })
                return {success: true, comment: 'Solved per TAU-Transition'}

            }
            /*=====================================================AOPT====================================================*/
            case FallthroughType.AOPT: {
                if (nodeSet && nodeSet.size === 1) {
                    // check for empty trace and repeating pattern
                    let sptResult = this.checkNotSPT(dfgNode.dfg)
                    if (sptResult.success) {
                        this.addLogEntry('ok')
                        this.addLogEntry('Checking if Fallthrough...')
                        let isFallthrough = FallthroughHelper.isFallthrough(dfgNode.dfg)
                        if (isFallthrough[0]) {
                            this.addLogEntry('Fallthrough detected!')
                            this.addLogEntry(isFallthrough[1])
                            this.addLogEntry('Check for Activity Once Per Trace')
                            const node = nodeSet.values().next().value;
                            if (this.checkAOPTforOne(node, dfgNode.dfg.eventLog)) {
                                this.addLogEntry('Activity Once Per Trace possible')
                                //lösche node aus eventlog
                                let eventlogWithoutAopt = dfgNode.dfg.eventLog.map(trace => trace.filter(activity => activity !== node));
                                /*
                                let eventlogWithoutAoptTemp: string[][] = [];
                                let emptytraceExists = false;

                                for (let trace of eventlogWithoutAopt) {
                                    if (trace.length === 0) {
                                        emptytraceExists = true; // Leeren Trace speichern
                                    } else {
                                        ValidationHelper.pushIfTraceNotInEventlog(eventlogWithoutAoptTemp, trace)
                                        // Nicht-leeren Trace speichern falls noch nicht vorhanden
                                    }
                                }
                                 */
                                // erstelle neue DFGs und inkorporiere sie ins petrinetz
                                const dfg1 = new DirectlyFollows();
                                dfg1.setDFGfromStringArray(eventlogWithoutAopt)
                                /*
                                if (emptytraceExists) {
                                    dfg1.eventLog.push([])
                                }
                                */
                                const newDfg1 = this.createEventlog(dfg1)
                                const dfg2 = new DirectlyFollows();
                                dfg2.setDFGfromStringArray([[node]])
                                const newDfg2 = this.createEventlog(dfg2)
                                this.incorporateParallel(dfgNode, newDfg1, newDfg2, workingGraph!)
                                this.addLogEntry('Activity Once Per Trace executed')
                                this.graphSignal.set({
                                    ...workingGraph!
                                })
                                return {success: true, comment: 'Activity Once Per Trace executed'}
                            } else {
                                this.addLogEntry('Activity Once Per Trace not possible with Node')
                                return {success: false, comment: 'Activity Once Per Trace not possible with Node'}
                            }
                        } else {
                            return {success: isFallthrough[0], comment: isFallthrough[1]};
                        }
                    } else {
                        return sptResult
                    }
                } else {
                    return {success: false, comment: 'You need to select exactly 1 node'}
                }

            }
            /*=====================================================Flower====================================================*/
            case FallthroughType.FLOWER: {
                let sptResult = this.checkNotSPT(dfgNode.dfg)
                if (sptResult.success) {
                    this.addLogEntry('ok')
                    this.addLogEntry('Checking if Fallthrough...')
                    let isFallthrough = FallthroughHelper.isFallthrough(dfgNode.dfg)
                    if (isFallthrough[0]) {
                        this.addLogEntry('Check for Activity Once Per Trace')
                        let aoptpossible = this.checkIfAOPTPossible(dfgNode.dfg)
                        if (aoptpossible[0]) {
                            this.addLogEntry(aoptpossible[1])
                            this.addLogEntry('Aborting Flower-Model...')
                            return {success: false, comment: aoptpossible[1]};
                        } else {
                            this.addLogEntry('No AOPT possible')
                            this.addLogEntry('Executing Flower-Model...')
                            let tempTransitionSet: Set<Node> = new Set()
                            for (let node of dfgNode.dfg.getNodes()) {
                                let newTransition = this.createTransition(node);
                                tempTransitionSet.add(newTransition)
                            }
                            let counter = 0;
                            let placeBefore: Node | undefined;
                            let placeAfter: Node | undefined;
                            // Schaut ob von Place vor DFG mehr als eine Kante ausgeht
                            for (let arc of workingGraph.arcs) {
                                if (arc.target === dfgNode) {
                                    counter++
                                    placeBefore = arc.source as Node;
                                    for (let sourceArc of workingGraph.arcs) {
                                        if (sourceArc.source === arc.source && sourceArc.target !== dfgNode) {
                                            counter++
                                        }
                                    }
                                }
                                // Schaut ob in Place nach DFG mehr als eine Kante eingeht
                                if (arc.source === dfgNode) {
                                    counter++
                                    placeAfter = arc.target as Node;
                                    for (let sourceArc of workingGraph.arcs) {
                                        if (sourceArc.target === arc.target && sourceArc.source !== dfgNode) {
                                            counter++
                                        }
                                    }
                                }
                            }
                            //verschmelze Stelle davor und danach, falls counter auf 2 steht
                            if (counter === 2 && placeBefore && placeAfter) {
                                workingGraph.arcs = workingGraph.arcs
                                    //lösche original DFG aus arcs
                                    .filter(arc => arc.source !== dfgNode && arc.target !== dfgNode)
                                    .map(arc => {
                                        if (arc.source === placeAfter) {
                                            return {...arc, source: placeBefore}
                                        }
                                        if (arc.target === placeAfter) {
                                            return {...arc, target: placeBefore};
                                        }
                                        return arc
                                    })
                                workingGraph?.places.delete(placeAfter)
                                workingGraph?.dfgSet.delete(dfgNode)
                                for (let transition of tempTransitionSet) {
                                    workingGraph?.transitions.add(transition)
                                    workingGraph?.arcs.push({source: placeBefore, target: transition})
                                    workingGraph?.arcs.push({source: transition, target: placeBefore})
                                }
                            } else {
                                //Löse via TAU
                                let tauTransitionBefore: Node = this.createTransition(this.generateUniqueId('TAU'))
                                workingGraph?.transitions.add(tauTransitionBefore)
                                let middlePlace: Node = this.createPlace(this.generateUniqueId('place'))
                                workingGraph?.places.add(middlePlace)
                                let tauTransitionAfter: Node = this.createTransition(this.generateUniqueId('TAU'))
                                workingGraph?.transitions.add(tauTransitionAfter)
                                workingGraph?.dfgSet.delete(dfgNode)
                                workingGraph.arcs = workingGraph.arcs
                                    .map(arc => {
                                        if (arc.source === dfgNode) {
                                            arc = {...arc, source: tauTransitionAfter};
                                        }
                                        if (arc.target === dfgNode) {
                                            arc = {...arc, target: tauTransitionBefore};
                                        }
                                        return arc
                                    })
                                workingGraph?.arcs.push({source: tauTransitionBefore, target: middlePlace})
                                workingGraph?.arcs.push({source: middlePlace, target: tauTransitionAfter})
                                workingGraph?.dfgSet.delete(dfgNode)
                                for (let transition of tempTransitionSet) {
                                    workingGraph?.transitions.add(transition)
                                    workingGraph?.arcs.push({source: middlePlace, target: transition})
                                    workingGraph?.arcs.push({source: transition, target: middlePlace})
                                }
                            }
                            this.graphSignal.set({
                                ...workingGraph
                            })
                            return {success: true, comment: 'Flower Model Executed'};
                        }
                    } else {
                        return {success: isFallthrough[0], comment: isFallthrough[1]};
                    }
                } else {
                    return sptResult
                }
            }
            default:
                break;
        }
        return {success: false, comment: 'No Fallthrough'};
    }

    private checkNotSPT(dfg: DirectlyFollows): ValidationResult {
        this.addLogEntry('Check for empty trace')
        if (dfg.eventLog.some(trace => trace.length === 0)) {
            this.addLogEntry('empty trace found, AOPT not possible')
            return {success: false, comment: 'AOPT not possible'}
        }
        this.addLogEntry('ok')
        // check for repeating pattern
        this.addLogEntry('Check for exclusively repeating pattern')
        if (dfg.isPatternExclusivelyRepeated()) {
            this.addLogEntry('exclusively repeating pattern found, AOPT not possible')
            return {success: false, comment: 'AOPT not possible'}
        }
        return {success: true, comment: 'ok'}
    }

    //gibt false zurück, wenn eine aktivität >1 und =! 0 mal in allen traces vorkommt
    private checkAOPTforOne(activity: string, eventlog: string[][]): boolean {
        for (let i of eventlog) {
            let counter = 0;
            for (const str of i) {
                if (str === activity) {
                    counter++;
                    if (counter > 1) {
                        return false;
                    }
                }
            }
            if (counter !== 1) {
                return false;
            }
        }
        return true
    }

    private checkIfAOPTPossible(dfg: DirectlyFollows): [boolean, string] {
        let allNodes = [...dfg.getNodes()];
        for (let node of allNodes) {
            if (this.checkAOPTforOne(node, dfg.eventLog)) {
                return [true, `AOPT possible for Activity ${node}`];
            }
        }
        return [false, ''];
    }

    /*==============================================================================================================================*/
    /*=================================================METHODEN zur Petrinetz Bearbeitung===========================================*/
    /*==============================================================================================================================*/

    // tauscht einen dfg im dfgset gegen zwei neue übergebene aus
    private exchangeDFGs(dfgOriginal: DfgNode, dfg1: DfgNode, dfg2: DfgNode, workingGraph: ProcessGraph) {
        workingGraph.dfgSet.delete(dfgOriginal);
        workingGraph.dfgSet.add(dfg1);
        workingGraph.dfgSet.add(dfg2);
    }

    // macht einen DFG durch hinzufügen einer TAU-Transition optional
    private makeOptional(dfg: DfgNode, workingGraph: ProcessGraph) {
        const tauTransition: Node = this.createTransition(this.generateUniqueId('TAU'));
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
    private occursInThisManyArcs<T>(arcs: Arc[], node: Node, maxCount: number = Infinity): {
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
    private findSources<T>(arcs: Arc[], target: Node): (Node | string)[] {
        return arcs
            .filter(arc => arc.target === target)
            .map(arc => arc.source);
    }

    private findTargets<T>(arcs: Arc[], source: Node): (Node | string)[] {
        return arcs
            .filter(arc => arc.source === source)
            .map(arc => arc.target);
    }

    private findSingularSourceForTarget<T>(arcs: Arc[], target: T): Node | string {
        for (const arc of arcs) {
            if (arc.target === target) {
                return arc.source; // Return the source if the target matches
            }
        }
        return 'null'; // Return null if no matching target is found
    }

    private findTargetForSource<T>(arcs: Arc[], source: T): Node | string {
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

    /*==============================================================================================================================*/

    /*===========================Methoden zur Erstellung von Places / Transitions / DFG/Eventlogs====================================*
    /*==============================================================================================================================*/

    private createPlace(name: string): Node {
        return {
            name: name,
            x: this.displayService.halfWidth(),
            y: this.displayService.halfHeight(),
            vx: 0,
            vy: 0,
            isDragged: false,
            isSelected: false,
            type: NodeType.place,
            height: PhysicsHelper.placeDiameter,
            width: PhysicsHelper.placeDiameter,
        };
    }

    private createTransition(name: string): Node {
        return {
            name: name,
            x: this.displayService.halfWidth(),
            y: this.displayService.halfHeight(),
            vx: 0,
            vy: 0,
            isDragged: false,
            isSelected: false,
            type: NodeType.transition,
            height: PhysicsHelper.placeDiameter,
            width: PhysicsHelper.placeDiameter,
        };
    }

    private createEventlog(dfg: DirectlyFollows): DfgNode {
        const name = this.generateUniqueId('DFG')

        return {
            name: name,
            dfg: dfg,
            x: this.displayService.halfWidth(),
            y: this.displayService.halfHeight(),
            vx: 0,
            vy: 0,
            isDragged: false,
            isSelected: false,
            type: NodeType.eventLog,
            height: PhysicsHelper.calculateEventLogHeight(dfg.eventLog),
            width: PhysicsHelper.eventLogWidth,
        };
    }


}
