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

    private placeCounter = 1;
    private tauCounter = 1;
    private dfgCounter =1;

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
        const firstPlace: Node = this.createPlace('Place_play');
        const playTransition: Node = this.createTransition("play");
        const tempPlace1: Node = this.createPlace();
        const tempPlace2: Node = this.createPlace();
        const lastPlace: Node = this.createPlace('Place_stop');
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
        this.addLogEntry('=======================')
        this.addLogEntry('Initial Graph generated')
        this.addLogEntry('=======================')
        if (this.isBaseCase(eventlog)){
            this.transformBaseCaseToTransition(this.graphSignal()!,eventlog)
        }
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

        if (result[0] && result[3] !== undefined && result[4] !== undefined) {

            if (result[3] && result[4]) {
                this.incorporateNewDFGs(data.dfg, result[3], result[4], data.cutType);
            }
            const currentGraph = this.graphSignal();
            if (currentGraph?.dfgSet.size===0){
                this.addLogEntry('=======================')
                this.addLogEntry('Inductive Miner to completion executed')
                this.addLogEntry('=======================')
            } else {
                this.addLogEntry("-----------------------")
            }
            if (currentGraph) {
                this.graphSignal.set({
                    ...currentGraph,
                    /* Entferne validationSuccessful oder passe an */
                });
            }
        } else {
            this.addLogEntry("-----------------------")
        }
        return {success: result[0], comment: result[1], reason: result[2]};
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
                this.addLogEntry("Parallel-Cut successfully executed")

                break
            case CutType.LOOP:
                this.incorporateLoop(dfgNodeOriginal, dfgNode1, dfgNode2, currentGraph);
                this.addLogEntry("Loop-Cut successfully executed")
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
        const middlePlace: Node = this.createPlace();
        //middlePlace ist die stelle zwischen dfg1 und dfg2

        let predPlace: Node;

        workingGraph.places.add(middlePlace);
        workingGraph.arcs = workingGraph.arcs.flatMap(arc => {
            // wenn target original DFG war, ersetze mit DFG 1, erstelle neuen arc dfg1 -> middlePlace
            if (arc.target === dfgOriginal) {

                // find the pred-Place of Original-DFG
                workingGraph.places.forEach((place) => {
                    if (place === arc.source) {
                        predPlace = place;
                    }
                })

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

        this.exchangeDFGs(dfgOriginal, dfg1, dfg2, workingGraph)
        middlePlace.x = dfgOriginal.x
        middlePlace.y = dfgOriginal.y
        dfg1.x = dfgOriginal.x - PhysicsHelper.eventLogWidth / 2
        dfg1.y = dfgOriginal.y
        dfg2.x = dfgOriginal.x + PhysicsHelper.eventLogWidth / 2
        dfg2.y = dfgOriginal.y

        //exchange positions if it's necessary
        this.exchangePositionsOfNodesIfNeeded(dfg1, dfg2, predPlace!);

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

        //finde place vor dfgOriginal
        let predPlace: Node;
        workingGraph.arcs.forEach((arc) => {
            if (arc.target === dfgOriginal) {
                // find the pred-Place of Original-DFG
                workingGraph.places.forEach((place) => {
                    if (place === arc.source) {
                        predPlace = place;
                    }
                })
            }
        })


        //Erstelle neue Places
        const firstPlaceNew2: Node = this.createPlace();
        firstPlaceNew2.x = dfg2.x - PhysicsHelper.eventLogWidth / 2;
        firstPlaceNew2.y = dfg2.y;
        workingGraph.places.add(firstPlaceNew2);
        const lastPlaceNew2: Node = this.createPlace();
        lastPlaceNew2.x = dfg2.x + PhysicsHelper.eventLogWidth / 2;
        lastPlaceNew2.y = dfg2.y;
        workingGraph.places.add(lastPlaceNew2);
        this.exchangePositionsOfNodesIfNeeded(firstPlaceNew2, lastPlaceNew2, predPlace!)
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
                    x.x = dfgOriginal.x - PhysicsHelper.eventLogWidth / 2
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
                    x.x = dfg1.x + PhysicsHelper.eventLogWidth / 2
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
            const firstPlaceNew1: Node = this.createPlace();
            firstPlaceNew1.x = dfg1.x - PhysicsHelper.eventLogWidth / 2;
            firstPlaceNew1.y = dfg1.y;
            let transitionNeedsChange = false;
            if(!this.checkIfNodeCloser(firstPlaceNew1, dfgOriginal, predPlace!)){
                firstPlaceNew1.x = dfg1.x + PhysicsHelper.eventLogWidth / 2;
                transitionNeedsChange = true;
            }
            workingGraph.places.add(firstPlaceNew1); // gefixt (firstPlaceNew2 -> firstPlaceNew1)
            const firstTauTransition: Node = this.createTransition();
            firstTauTransition.x= firstPlaceNew1.x - PhysicsHelper.placeDiameter
            firstTauTransition.y= dfgOriginal.y
            if(transitionNeedsChange){
                firstTauTransition.x += 2*PhysicsHelper.placeDiameter
            }
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
            const lastPlaceNew1: Node = this.createPlace();
            lastPlaceNew1.x = dfg1.x + PhysicsHelper.eventLogWidth / 2;
            lastPlaceNew1.y = dfg1.y;
            let transitionNeedsChange = false;
            if(this.checkIfNodeCloser(lastPlaceNew1, dfgOriginal, predPlace!)){
                lastPlaceNew1.x = dfg1.x - PhysicsHelper.eventLogWidth / 2;
                transitionNeedsChange = true;
            }
            workingGraph.places.add(lastPlaceNew1);
            const lastTauTransition: Node = this.createTransition();
            lastTauTransition.x = lastPlaceNew1.x + PhysicsHelper.placeDiameter
            lastTauTransition.y = dfgOriginal.y
            if(transitionNeedsChange){
                lastTauTransition.x -= 2*PhysicsHelper.placeDiameter
            }
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
        dfg1.x = dfgOriginal.x;
        dfg1.y = dfgOriginal.y + dfgOriginal.height
        dfg2.x = dfgOriginal.x
        dfg2.y = dfgOriginal.y -  dfgOriginal.height;

        //finde place vor dfgOriginal
        let predPlace: Node;
        workingGraph.arcs.forEach((arc) => {
            if (arc.target === dfgOriginal) {
                // find the pred-Place of Original-DFG
                workingGraph.places.forEach((place) => {
                    if (place === arc.source) {
                        predPlace = place;
                    }
                })
            }
        })
        //check if original dfg has just one source-place and source place has just one outgoing edge
        if (this.occursInThisManyArcsAsTarget(workingGraph.arcs, dfgOriginal, 1).count === 1) {
            let sourcePlace = this.findSingularSourceForTarget(workingGraph.arcs, dfgOriginal)
            let sourceOccurs = this.occursInThisManyArcsAsSource(workingGraph.arcs, sourcePlace, 1)
            let placeHasJustOneFollower: boolean = sourceOccurs.count === 1 && sourceOccurs.underThreshold
            // then there is no tau needed..
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
        const newPlace: Node = this.createPlace();
        newPlace.x = dfg1.x-PhysicsHelper.eventLogWidth/2-PhysicsHelper.placeDiameter;
        newPlace.y = dfg1.y;
        let transitionNeedsChange = false;
        if(!this.checkIfNodeCloser(newPlace, dfgOriginal, predPlace!)){
            newPlace.x = dfg1.x + PhysicsHelper.eventLogWidth/2 + PhysicsHelper.placeDiameter;
            transitionNeedsChange = true;
        }
        workingGraph.places.add(newPlace);
        const newTransition: Node = this.createTransition();
        newTransition.x = newPlace.x - PhysicsHelper.placeDiameter
        newTransition.y = newPlace.y
        if(transitionNeedsChange){
            newTransition.x = newPlace.x + PhysicsHelper.placeDiameter
        }
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
        let newTransition: Node;
        if (node === 'empty_trace') {
            newTransition = this.createTransition();
            this.addLogEntry(`Base Case detected - \"${node}\"`)
        } else {
            newTransition = this.createTransition(node);
            this.addLogEntry(`Base Case detected - \"${node}\"`)
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
        workingGraph.dfgSet.delete(dfgNode);
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
                this.addLogEntry('Trying to execute Tau-Loop')
                // Check for Empty trace
                let emptyTrace = dfgNode.dfg.eventLog.some(trace => trace.includes('empty_trace'));
               //
                let repeatingPattern : boolean
                if (emptyTrace){
                    dfgNode.dfg.eventLog = dfgNode.dfg.eventLog.filter(trace => !trace.includes('empty_trace'));
                    repeatingPattern = dfgNode.dfg.isPatternExclusivelyRepeated()
                } else {
                    repeatingPattern = dfgNode.dfg.isPatternExclusivelyRepeated()
                }
                if (!repeatingPattern) {
                    this.addLogEntry('no repeating Pattern found')
                    this.addLogEntry("-----------------------")
                    return {success: false, comment: 'Tau-Loop not possible', reason: 'no repeating Pattern found'}
                }
                this.addLogEntry('Repeating Pattern found - ok')
                if (emptyTrace) {
                    this.addLogEntry("Empty Trace found - ok")
                    this.makeOptional(dfgNode, workingGraph)
                    //lösche empty trace
                    dfgNode.dfg.eventLog = dfgNode.dfg.eventLog.filter(trace => trace.length > 0);
                }
                // Passe eventlog sowie Arcs an
                let repeatedPattern = dfgNode.dfg.getRepeatedPattern();
                let dfgNew= new DirectlyFollows();
                dfgNew.setDFGfromStringArray([repeatedPattern]);
                dfgNode.dfg = dfgNew;
                dfgNode.dfg.arcs = dfgNode.dfg.arcs.filter(arc =>
                    !(arc.target === repeatedPattern[0] && arc.source === repeatedPattern[repeatedPattern.length - 1])
                );
                if (emptyTrace) { //DFG ist im REDO Part
                    // Drehe Kanten um
                    dfgNode.y = dfgNode.y - dfgNode.height
                    this.addLogEntry('Resulting Eventlog in REDO-Part')
                    workingGraph.arcs.forEach(arc => {
                        if (arc.target === dfgNode || arc.source === dfgNode) {
                            [arc.source, arc.target] = [arc.target, arc.source]
                        }
                    })
                } else { //DFG ist im DO Part
                    // Füge Tau Transition als REDO ein
                    this.addLogEntry('Resulting Eventlog in DO-Part')
                    const tauTransition: Node = this.createTransition()
                    tauTransition.x = dfgNode.x
                    tauTransition.y = dfgNode.y-dfgNode.height
                    dfgNode.y = dfgNode.y + dfgNode.height
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
                this.addLogEntry('TAU-Loop executed')
                this.checkAndTransformDFGtoBasecase(dfgNode, workingGraph)
                if (workingGraph?.dfgSet.size===0){
                    this.addLogEntry('=======================')
                    this.addLogEntry('Inductive Miner to completion executed')
                    this.addLogEntry('=======================')
                } else {
                    this.addLogEntry("-----------------------")
                }
                this.graphSignal.set({
                    ...workingGraph
                })
                return {success: true, comment: 'TAU-Loop executed', reason: ''}

            }
            /*=====================================================AOPT====================================================*/
            case FallthroughType.AOPT: {
                this.addLogEntry('Trying to execute AOPT')
                if (nodeSet && nodeSet.size === 1) {
                    // check for empty trace and repeating pattern
                    let sptResult = this.checkNotSPT(dfgNode.dfg)
                    if (sptResult.success) {
                        let isFallthrough = FallthroughHelper.isFallthrough(dfgNode.dfg)
                        if (isFallthrough[0]) {
                            this.addLogEntry('Fallthrough detected!')
                            const node = nodeSet.values().next().value;
                            if (this.checkAOPTforOne(node, dfgNode.dfg.eventLog)) {
                                //lösche node aus eventlog
                                let eventlogWithoutAopt: string[][] = dfgNode.dfg.eventLog.map(trace => trace.filter(activity => activity !== node));
                                eventlogWithoutAopt = eventlogWithoutAopt.map(trace =>
                                    trace.length === 0 ? ['empty_trace'] : trace
                                );
                                // erstelle neue DFGs und inkorporiere sie ins petrinetz
                                const dfg1 = new DirectlyFollows();
                                dfg1.setDFGfromStringArray(eventlogWithoutAopt)
                                const newDfg1 = this.createEventlog(dfg1)
                                const dfg2 = new DirectlyFollows();
                                dfg2.setDFGfromStringArray([[node]])
                                const newDfg2 = this.createEventlog(dfg2)
                                this.incorporateParallel(dfgNode, newDfg1, newDfg2, workingGraph!)
                                this.addLogEntry('Activity Once Per Trace executed')
                                if (workingGraph?.dfgSet.size===0){
                                    this.addLogEntry('=======================')
                                    this.addLogEntry('Inductive Miner to completion executed')
                                    this.addLogEntry('=======================')
                                } else {
                                    this.addLogEntry("-----------------------")
                                }
                                this.graphSignal.set({
                                    ...workingGraph!
                                })
                                return {success: true, comment: 'Activity Once Per Trace executed',reason:''}
                            } else {
                                this.addLogEntry('AOPT not possible with selected Node')
                                return {success: false, comment: 'Activity Once Per Trace not possible', reason:'Selected Node not exactly once in every Trace'}
                            }
                        } else {
                            this.addLogEntry("-----------------------")
                            return {success: isFallthrough[0], comment:'No Fallthrough detected' , reason: 'A cut is possible'};
                        }
                    } else {
                        this.addLogEntry('Tau-Loop found')
                        this.addLogEntry("-----------------------")
                        return {success: false, comment: 'Activity Once Per Trace not possible', reason: 'Repeating Pattern found'}
                    }
                } else {
                    this.addLogEntry('More than one node was selected')
                    this.addLogEntry("-----------------------")
                    return {success: false, comment: 'Activity Once Per Trace not possible', reason: 'More than one Node was selected'}
                }

            }
            /*=====================================================Flower====================================================*/
            case FallthroughType.FLOWER: {
                this.addLogEntry('Trying to execute Flower-Model')
                let sptResult = this.checkNotSPT(dfgNode.dfg)
                if (sptResult.success) {
                    let isFallthrough = FallthroughHelper.isFallthrough(dfgNode.dfg)
                    if (isFallthrough[0]) {
                        let aoptpossible = this.checkIfAOPTPossible(dfgNode.dfg)
                        if (aoptpossible[0]) {
                            this.addLogEntry(aoptpossible[1])
                            this.addLogEntry("-----------------------")
                            return {success: false, comment: 'Flower Model not allowed', reason:'Activity Once Per Trace is possible'};
                        } else {
                            let tempTransitionArray:Node[] = [];
                            let nodeAmount = dfgNode.dfg.getNodes().size
                            let circularPositions = this.generateCircularPositions(dfgNode.x, dfgNode.y, PhysicsHelper.nodeDiameter*2,nodeAmount)
                            for (let node of dfgNode.dfg.getNodes()) {
                                let newTransition = this.createTransition(node);
                                tempTransitionArray.push(newTransition)
                            }
                            for (let i=0; i<tempTransitionArray.length; i++) {
                                tempTransitionArray[i].x=circularPositions[i].x
                                tempTransitionArray[i].y=circularPositions[i].y
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
                                placeBefore.x = dfgNode.x
                                placeBefore.y = dfgNode.y
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
                                for (let transition of tempTransitionArray) {
                                    workingGraph?.transitions.add(transition)
                                    workingGraph?.arcs.push({source: placeBefore, target: transition})
                                    workingGraph?.arcs.push({source: transition, target: placeBefore})
                                }
                            } else {
                                //Löse via TAU
                                let tauTransitionBefore: Node = this.createTransition()
                                tauTransitionBefore.x = dfgNode.x-PhysicsHelper.nodeDiameter*3
                                tauTransitionBefore.y = dfgNode.y
                                workingGraph?.transitions.add(tauTransitionBefore)
                                let middlePlace: Node = this.createPlace()
                                middlePlace.x = dfgNode.x
                                middlePlace.y = dfgNode.y
                                workingGraph?.places.add(middlePlace)
                                let tauTransitionAfter: Node = this.createTransition()
                                tauTransitionAfter.x = dfgNode.x+PhysicsHelper.nodeDiameter*3
                                tauTransitionAfter.y = dfgNode.y
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
                                for (let transition of tempTransitionArray) {
                                    workingGraph?.transitions.add(transition)
                                    workingGraph?.arcs.push({source: middlePlace, target: transition})
                                    workingGraph?.arcs.push({source: transition, target: middlePlace})
                                }

                                let predNode: Node;
                                workingGraph.arcs.forEach(arc => {
                                    // find the pred-Place
                                    workingGraph.places.forEach((place) => {
                                        if (tauTransitionBefore === arc.target && place === arc.source) {
                                            predNode = place;
                                        }
                                    })
                                })
                                // exchange positions if it's necessary
                                this.exchangePositionsOfNodesIfNeeded(tauTransitionBefore, tauTransitionAfter, predNode!);
                            }
                            this.addLogEntry("Flower Model Executed")
                            if (workingGraph?.dfgSet.size===0){
                                this.addLogEntry('=======================')
                                this.addLogEntry('Inductive Miner to completion executed')
                                this.addLogEntry('=======================')
                            } else {
                                this.addLogEntry("-----------------------")                            }
                            this.graphSignal.set({
                                ...workingGraph
                            })
                            return {success: true, comment: 'Flower Model Executed', reason:''};
                        }
                    } else {
                        this.addLogEntry(isFallthrough[1])
                        this.addLogEntry("-----------------------")
                        return {success: isFallthrough[0], comment:'No Fallthrough detected' , reason: 'A cut is possible'};
                    }
                } else {
                    this.addLogEntry(sptResult.comment)
                    this.addLogEntry("-----------------------")
                    return {success: false, comment: 'Flower Model not allowed', reason: 'Repeating Pattern found'}
                }
            }
            default:
                return {success: false, comment: 'No Fallthrough-Type selected', reason: ''}
        }
    }

    private checkNotSPT(dfg: DirectlyFollows): ValidationResult {
        let result = ValidationHelper.testForTauOrRepeatingPattern(dfg.eventLog)
        return {success: result[0], comment: result[1], reason:''}
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
    /*=======================================================Give TIP===============================================================*/
    /*==============================================================================================================================*/
    public giveTip(dfgNode: DfgNode): [string, string] {
        let isFallthrough = FallthroughHelper.isFallthrough(dfgNode.dfg)
        // Returns Possible cut as first string and between which Nodes the Cut is as second string
        if (!isFallthrough[0]) {
            console.log(isFallthrough[2])
            return [isFallthrough[1],isFallthrough[2]]
        }
        let aoptpossible = this.checkIfAOPTPossible(dfgNode.dfg)
        let resultString = '';
        // if TauLoop is Possible give Tip
        if (!this.checkNotSPT(dfgNode.dfg).success){
            resultString += 'There is a Repeating Pattern ==> Tau-Loop'
        } else if(aoptpossible[0]) {
            resultString += aoptpossible[1]
        } else {
            resultString += 'neither APOT nor Tau-Loop possible.\nUse Flower Model'
        }
        console.log(resultString)
        return ['Fallthrough detected', resultString]
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
        const tauTransition: Node = this.createTransition();
        tauTransition.x=dfg.x
        tauTransition.y=dfg.y +dfg.height
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



    /*======================================Process-Graph-Signal - UPDATE-METHODEN===========================================*/


    /*======================================LOG - UPDATE - METHODEN===========================================*/

    addLogEntry(entry: string): void {
        this.logSignal.update(currentLog => [...currentLog, entry]);
    }

    /*==============================================================================================================================*/

    /*===========================Methoden zur Erstellung von Places / Transitions / DFG/Eventlogs====================================*
    /*==============================================================================================================================*/

    private createPlace(name?: string): Node {
        if (name) {
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
        } else {
            let counter = this.placeCounter
            this.placeCounter ++;
            let countedPlaceName= "Place_"+counter
            return {
                name: countedPlaceName,
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


    }

    private createTransition(name?: string): Node {
        if (name){
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
            }
        } else{
            let counter = this.tauCounter
            this.tauCounter ++;
            let countedTauName= "TAU_"+counter
            return {
                name: countedTauName,
                x: this.displayService.halfWidth(),
                y: this.displayService.halfHeight(),
                vx: 0,
                vy: 0,
                isDragged: false,
                isSelected: false,
                type: NodeType.transition,
                height: PhysicsHelper.placeDiameter,
                width: PhysicsHelper.placeDiameter,
            }
        }

    }

    private createEventlog(dfg: DirectlyFollows): DfgNode {
        let counter = this.dfgCounter
        this.dfgCounter ++;
        let name= "DFG_"+counter
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
    private generateCircularPositions(x: number, y: number, distance: number, n: number): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        const angleStep = (2 * Math.PI) / n;

        for (let i = 0; i < n; i++) {
            const angle = i * angleStep;
            const newX = x + distance * Math.cos(angle);
            const newY = y + distance * Math.sin(angle);
            positions.push({ x: newX, y: newY });
        }

        return positions;
    }

    // helps to locate the transitions or dfgs after sequence-cut in better positions
    private exchangePositionsOfNodesIfNeeded(node1: Node, node2: Node, predPlace: Node) {
        // check, if the node2 (which comes after node1, middlePlace) is closer to predPlace than node1
        const dist1 = this.calculateSquaredEuclideanDistance(node1.x, node1.y, predPlace.x, predPlace.y);
        const dist2 = this.calculateSquaredEuclideanDistance(node2.x, node2.y, predPlace.x, predPlace.y);
        if (dist2 <= dist1) {
            // switch positions of two nodes
            const tempX = node1.x
            const tempY = node1.y
            node1.x = node2.x
            node1.y = node2.y
            node2.x = tempX;
            node2.y = tempY;
        }
    }

    // help function to calculate squared euclidean distance
    private calculateSquaredEuclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    private checkIfNodeCloser(nodeCloser: Node, nodeFurther: Node, predPlace:Node){
        const dist1 = this.calculateSquaredEuclideanDistance(nodeCloser.x, nodeCloser.y, predPlace.x, predPlace.y);
        const dist2 = this.calculateSquaredEuclideanDistance(nodeFurther.x, nodeFurther.y, predPlace.x, predPlace.y);
        return dist1 <= dist2;

    }

}
