import {DirectlyFollows} from '../classes/directly-follows'
import {ValidationData} from '../classes/validation-data'
import {CutType} from "../classes/cut-type.enum";
import {LoopState} from '../classes/loop-state.enum'
import {Dir} from "@angular/cdk/bidi";


export class ValidationHelper {

    public static validateAndReturn(dfg: DirectlyFollows,
                                    firstNodeSet: Set<string>,
                                    secondNodeSet: Set<string>,
                                    cutType: CutType,
                                    updateLog: (log: string) => void): [boolean, string, DirectlyFollows?, DirectlyFollows?] {
        this.setLogFunction(updateLog);
        this.log('----------------------------------')

        let eventlog = dfg.getEventLog()
        if (eventlog.some(trace => trace.includes('empty_trace'))) {
            console.log('hier')
            let tempLog = dfg.eventLog.filter(trace => !trace.includes('empty_trace'));
            let tempDfg: DirectlyFollows = new DirectlyFollows();
            tempDfg.setDFGfromStringArray(tempLog)
            console.log(tempDfg.eventLog)
            if (tempDfg.isPatternExclusivelyRepeated()) {
                console.log('hier2')
                return [false, 'Combination of empty trace and repeating pattern found.' +
                '\nPlease Solve Per Tau!']
            }
        }

        this.log('Start validation for cutType: ${cutType}');
        const validationResult: [boolean, string] = this.validator(dfg, firstNodeSet, secondNodeSet, cutType)
        if (!validationResult[0]) {
            return validationResult
        }
        this.log('creating new DFG from NodeSets')
        //       let dfg1: DirectlyFollows = this.createNewDFG(dfg, firstNodeSet)
        //      let dfg2: DirectlyFollows = this.createNewDFG(dfg, secondNodeSet)
        let splitEventlogs = this.splitEventlogs(dfg, firstNodeSet, secondNodeSet, cutType);
        let dfg1: DirectlyFollows = new DirectlyFollows();
        const eventlog0 = splitEventlogs[0].map(innerArray =>
            innerArray.length === 0 ? ['empty_trace'] : innerArray
        );
        const eventlog1 = splitEventlogs[1].map(innerArray =>
            innerArray.length === 0 ? ['empty_trace'] : innerArray
        );
        dfg1.setDFGfromStringArray(eventlog0)
        let dfg2: DirectlyFollows = new DirectlyFollows();
        dfg2.setDFGfromStringArray(eventlog1)
        dfg1.setEventLog(eventlog0);
        dfg2.setEventLog(eventlog1);
        return [validationResult[0], validationResult[1], dfg1, dfg2]
    }

    // Statische Eigenschaft für das Logging
    private static LogFunc: (log: string) => void = () => {
    };

    // Setze den Log-Handler
    private static setLogFunction(logFunc: (log: string) => void): void {
        this.LogFunc = logFunc;
    }

    // methode zum loggen (ruft die aktuell gesetzte logFunc auf)
    private static log(message: string): void {
        this.LogFunc(message);  // Aufrufen der Log-Funktion
    }

    private static createNewDFG(dfg: DirectlyFollows, nodeSet: Set<string>): DirectlyFollows {
        let resultDFG: DirectlyFollows = new DirectlyFollows()
        let tempNodeSet: Set<string> = new Set()
        for (const [origin, successorSet] of dfg.successorMap) {
            if (nodeSet.has(origin)) {
                for (let successor of successorSet) {
                    if (nodeSet.has(successor)) {
                        resultDFG.addSuccessor(origin, successor)
                    } else {
                        resultDFG.addSuccessor(origin, "stop")
                    }
                }
            } else {
                for (let successor of successorSet) {
                    if (nodeSet.has(successor)) {
                        tempNodeSet.add(successor)
                    }
                }
            }
        }
        for (const node of tempNodeSet) {
            resultDFG.addSuccessor("play", node)
        }
        resultDFG.createPredecessorMap();
        resultDFG.setNodes();
        resultDFG.generateArcs();
        return resultDFG
    }


    //Nimmt als eingabe einen DFG, 2 Knotenmengen sowie die Cutmethode als string, prüft den cut und gibt true, bzw false mit einem String als Begründung aus
    private static validator(dfg: DirectlyFollows,
                             firstNodeSet: Set<string>,
                             secondNodeSet: Set<string>,
                             cutType: string): [boolean, string] {
        this.log("checking if NodeSets are empty");
        if (!firstNodeSet || !secondNodeSet || firstNodeSet.size === 0 || secondNodeSet.size === 0) {
            this.log("A passed NodeSet is empty");
            return [false, "A passed NodeSet is empty"];
        }
        this.log("ok");
        //TODO: evtl rausnehmen da per def. eigentlich nicht möglich ?!
        this.log("checking if all nodes are present and node sets are exclusive");
        if (!this.allNodesUsedValidation(dfg, firstNodeSet, secondNodeSet)) {
            this.log("not all node sets are present and / or exclusive")
            return [false, "All nodes must be present, and the sets must be exclusive"]
        }
        this.log("ok");
        switch (cutType) {
            case CutType.XOR: {
                return this.xorValidation(dfg, firstNodeSet, secondNodeSet);
            }
            case CutType.SEQUENCE: {
                return this.sequenceValidation(dfg, firstNodeSet, secondNodeSet);
            }
            case CutType.PARALLEL: {
                return this.parallelValidation(dfg, firstNodeSet, secondNodeSet);
            }
            case CutType.LOOP: {
                return this.loopValidation(dfg, firstNodeSet, secondNodeSet);
            }
            default: {
                break;
            }
        }
        this.log("unknown error");
        return [false, "unknown error"]
    }

    private static allNodesUsedValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): boolean {
        //Prüfe, ob Schnittmenge leer
        let intersection = new Set<string>([...firstNodeSet].filter(element => secondNodeSet.has(element)))
        if (intersection.size !== 0) {
            return false
        }
        // Prüfe ob Vereinigung alle Schlüssel der Map enthält
        let union = new Set<string>([...firstNodeSet, ...secondNodeSet])
        for (let node of dfg.getNodes()) {
            if (!union.has(node)) {
                return false //Schlüssel nicht in Knotenmenge Vorhanden
            }
        }
        return true
    }

    //Prüft auf XOR-Cut
    private static xorValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        //Prüfe, ob keine Kanten von Knotenmenge 1 nach Knotenmenge 2
        this.log("checking if there are no arcs from NodeSet 1 to NodeSet 2");
        for (let nodeFirst of firstNodeSet) {
            let nodeFirstSuccessors = dfg.getSuccessors(nodeFirst)
            if (nodeFirstSuccessors) {
                for (let nodeFirstSuccessor of nodeFirstSuccessors) {
                    if (secondNodeSet.has(nodeFirstSuccessor)) {
                        this.log(`arc from ${nodeFirst} to ${nodeFirstSuccessor} found`);
                        return [false, `arc from ${nodeFirst} to ${nodeFirstSuccessor} found`]
                    }
                }
            }
        }
        this.log("ok");
        this.log("checking if there are no arcs from NodeSet 2 to NodeSet 1");
        //Prüfe, ob keine Kanten von Knotenmenge 2 nach Knotenmenge 1
        for (let nodeSecond of secondNodeSet) {
            let nodeSecondSuccessors = dfg.getSuccessors(nodeSecond)
            if (nodeSecondSuccessors) {
                for (let nodeSecondSuccessor of nodeSecondSuccessors) {
                    if (firstNodeSet.has(nodeSecondSuccessor)) {
                        this.log(`arc from ${nodeSecond} to ${nodeSecondSuccessor} found`);
                        return [false, `arc from ${nodeSecond} to ${nodeSecondSuccessor} found`]
                    }
                }
            }
        }
        this.log('ok')
        this.log("XOR-Cut successfully validated");
        return [true, 'XOR-Cut successful']
    }

    //Prüft auf Sequence-Cut
    private static sequenceValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        this.log("checking for paths for all Nodes of NodeSet 1 to all Nodes of NodeSet 2");
        //Prüfe, ob von allen Knoten der ersten Knotenmenge auch ein Weg zu allen Knoten der zweiten Knotenmenge führt
        for (let nodeFirst of firstNodeSet) {
            for (let nodeSecond of secondNodeSet) {
                if (!dfg.existsPath(new Set([nodeFirst]), new Set([nodeSecond]))) {
                    this.log(`No path from ${nodeFirst} to ${nodeSecond} found`)
                    return [false, `No path from ${nodeFirst} to ${nodeSecond} found`]
                }
            }
        }
        this.log("ok");
        this.log("checking that there are no paths for all Nodes of NodeSet 2 to NodeSet 1");
        // Prüfe, dass kein Weg von Knotenmenge 2 in Knotenmenge 1 führt
        for (let nodeSecond of secondNodeSet) {
            if (dfg.existsPath(new Set([nodeSecond]), firstNodeSet)) {
                this.log(`Path from ${nodeSecond} to first NodeSet found`)
                return [false, `Path from ${nodeSecond} to first NodeSet found`]
            }
        }
        this.log("ok")
        this.log("Sequence-Cut successfully validated");
        return [true, 'Sequence-Cut successful']
    }

    private static parallelValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        this.log('verifying if there are arcs from every Node of one Set to every Node of the other \n ' +
            'and verifying a path from play to stop for each node within its own set')
        for (let nodeFirst of firstNodeSet) {
            let arcsOfSource = dfg.getArcsOfSourceNode(nodeFirst);
            let targetsOfSource = new Set(arcsOfSource.map(arc => arc.target as string));
            for (const nodeSecond of secondNodeSet) {
                if (!targetsOfSource.has(nodeSecond)) {
                    this.log(`No arc between ${nodeFirst} and ${nodeSecond} found`);
                    return [false, `No arc between ${nodeFirst} and ${nodeSecond} found`];
                }
            }
            if (!dfg.existsFullPathOverNode(nodeFirst, firstNodeSet)) {
                this.log(`No path found from play to ${nodeFirst} to stop that includes only nodes from the own set`)
                return [false, `No path found from play to ${nodeFirst} to stop that includes only nodes from the own set`];
            }
        }
        for (let nodeSecond of secondNodeSet) {
            let arcsOfSource = dfg.getArcsOfSourceNode(nodeSecond);
            let targetsOfSource = new Set(arcsOfSource.map(arc => arc.target as string));
            for (const nodeFirst of firstNodeSet) {
                if (!targetsOfSource.has(nodeFirst)) {
                    this.log(`No arc between ${nodeSecond} and ${nodeFirst} found`)
                    return [false, `No arc between ${nodeSecond} and ${nodeFirst} found`];
                }
            }
            if (!dfg.existsFullPathOverNode(nodeSecond, secondNodeSet)) {
                this.log(`No path found from play to ${nodeSecond} to stop that includes only nodes from the own set`)
                return [false, `No path found from play to ${nodeSecond} to stop that includes only nodes from the own set`];
            }
        }
        this.log('ok')
        this.log('Parallel-Cut successfully validated')
        return [true, 'Parallel-Cut successful']
    }

//TODO: logs einleuchtender..
    private static loopValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        //erstelle die verschiedenen play/stop mengen
        this.log('Creating DOplay, DOstop, REDOplay, REDOstop')
        let firstNodeSetPlay = this.createPlaySet(dfg, firstNodeSet);
        let firstNodeSetStop = this.createStopSet(dfg, firstNodeSet)
        let secondNodeSetPlay = this.createPlaySet(dfg, secondNodeSet);
        let secondNodeSetStop = this.createStopSet(dfg, secondNodeSet);

        //Validiere ob alle Kanten von play nach firstNodeSetPlay gehen
        this.log('validate that all arcs from play go to DOplay')
        let playNodes = dfg.getPlayNodes();
        if (playNodes) {
            for (const node of playNodes) {
                if (!firstNodeSetPlay.has(node)) {
                    this.log(`There exists a arc from play to ${node}`)
                    return [false, `There exists a arc from play to ${node}`];
                }
            }
        }
        this.log('ok');
        this.log('validate that all arcs from stop come from DOstop')
        //Validiere ob alle Kanten nach stop von firstNodeSetStop ausgehen
        let stopNodes = dfg.getStopNodes();
        if (stopNodes) {
            for (const node of stopNodes) {
                if (!firstNodeSetStop.has(node)) {
                    this.log(`There exists an arc from ${node} to stop`)
                    return [false, `There exists an arc from ${node} to stop`]
                }
            }
        }
        this.log('ok');
        this.log('validate if every node in REDOstop union play has an arc to every node in DOplay')
        //Validiere ob es für alle Knoten von secondNodeSetStop vereinigt mit play eine Kante zu jedem Knoten aus firstNodeSetPlay gibt
        let playWithSecondNodeSetStop: Set<string> = new Set(secondNodeSetStop);
        playWithSecondNodeSetStop.add('play');
        for (let node1 of playWithSecondNodeSetStop) {
            let node1Successors = dfg.getSuccessors(node1);
            // gehe alle Nachfolger von Ausgangsknoten ab und ob alle Knoten aus firstNodeSetPlay enthalten
            for (let node2 of firstNodeSetPlay) {
                // falls eine Kante nicht gefunden return false
                if (!node1Successors?.has(node2)) {
                    this.log(`No arc was found between ${node1} and ${node2}`)
                    return [false, `No arc was found between ${node1} and ${node2}`];
                }
            }
        }
        this.log('ok')
        this.log('validate if all nodes in Dostop have an edge to stop union RedoPlay')
        //Validiere ob es für alle Knoten von firstNodeSetStop eine Kante nach stop vereinigt secondNodeSetPlay gibt
        let stopWithSecondNodeSetPlay: Set<string> = new Set(secondNodeSetPlay);
        stopWithSecondNodeSetPlay.add('stop');
        for (let node1 of firstNodeSetStop) {
            let node1Successors = dfg.getSuccessors(node1)
            // gehe alle Nachfolger von Ausgangsknoten ab und schau, ob stop und secondNodeSetPlay enthalten sind
            for (let node2 of stopWithSecondNodeSetPlay) {
                // falls eine Kante nicht gefunden return false
                if (!node1Successors?.has(node2)) {
                    return [false, `No arc between ${node1} and ${node2} found`]
                }
            }
        }
        this.log('ok')
        this.log('Loop-Cut successfully validated')
        return [true, 'Loop-Cut successful']
    }

    //Erstellt ein Set an Knoten, zu denen mind. eine Kante führt, die nicht aus der eigenen Menge stammt
    private static createPlaySet(dfg: DirectlyFollows, nodeSet: Set<string>): Set<string> {
        let resultSet = new Set<string>();
        //gehe übergebene Knotenmenge durch und suche vorgänger
        for (const node of nodeSet) {
            const predecessors = dfg.getPredecessors(node);
            if (predecessors) {
                let hasPredecessorFromWithoutSet = false;
                for (let predecessor of predecessors) {
                    //wenn ein Vorgänger nicht im set ist gib true zurück
                    if (!nodeSet.has(predecessor)) {
                        hasPredecessorFromWithoutSet = true;
                        break
                    }
                }
                //speichere playKnoten im Result
                if (hasPredecessorFromWithoutSet) {
                    resultSet.add(node);
                }
            }
        }
        return resultSet
    }

    private static createStopSet(dfg: DirectlyFollows, nodeSet: Set<string>): Set<string> {
        let resultSet = new Set<string>();
        //gehe übergebene Knotenmenge durch und suche Nachfolger
        for (const node of nodeSet) {
            const successors = dfg.getSuccessors(node);
            if (successors) {
                let hasSuccessorFromWithoutSet = false;
                for (let successor of successors) {
                    //wenn ein nachfolger nicht im set ist gib true zurück
                    if (!nodeSet.has(successor)) {
                        hasSuccessorFromWithoutSet = true;
                        break
                    }
                }
                if (hasSuccessorFromWithoutSet) {
                    resultSet.add(node);
                }
            }
        }
        return resultSet
    }

    //splitte das eventlog für die zwei graphen
    private static splitEventlogs(originalDFG: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>, cutType: CutType): [string[][], string[][]] {
        let originalEventlog = originalDFG.getEventLog();
        //erstelle Rückgabewerte  der 2 resultierenden Eventlogs nach dem cut
        let firstEventlog: string[][] = [];
        let secondEventlog: string[][] = [];
        switch (cutType) {
            case CutType.XOR:
                // sobald eine Aktivitaet aus einem trace zum Nodeset passt, wird der gesamte trace
                // ins jeweilige Eventlog aufgenommen
                for (let trace of originalEventlog) {
                    if (firstNodeSet.has(trace[0])) {
                        this.pushIfTraceNotInEventlog(firstEventlog, trace)
                    } else {
                        this.pushIfTraceNotInEventlog(secondEventlog, trace)
                    }
                }
                return [firstEventlog, secondEventlog]

            case CutType.SEQUENCE:
                // trace wird ab der Aktivität gespalten, die zum zweiten Nodeset gehört
                for (let trace of originalEventlog) {
                    let tempIterator = -1;
                    for (let activity of trace) {
                        tempIterator++;
                        if (secondNodeSet.has(activity)) {
                            this.pushIfTraceNotInEventlog(firstEventlog, trace.slice(0, tempIterator))
                            this.pushIfTraceNotInEventlog(secondEventlog, trace.slice(tempIterator, trace.length))
                            break
                        }
                        if (tempIterator == trace.length - 1) {
                            this.pushIfTraceNotInEventlog(firstEventlog, trace)
                            this.pushIfTraceNotInEventlog(secondEventlog, [])
                        }
                    }
                }
                return [firstEventlog, secondEventlog]

            case CutType.PARALLEL:
                //es werden alle traces durchlaufen und 2 temp-traces erstellt
                for (let trace of originalEventlog) {
                    let tempTraceFirst: string[] = trace.filter(activity => firstNodeSet.has(activity));
                    let tempTraceSecond: string[] = trace.filter(activity => secondNodeSet.has(activity));
                    this.pushIfTraceNotInEventlog(firstEventlog, tempTraceFirst)
                    this.pushIfTraceNotInEventlog(secondEventlog, tempTraceSecond)
                }

                return [firstEventlog, secondEventlog]

            // In der Ausgabe ist im firstEventlog der Do-Part und in secondEventlog der Redo-Part
            case CutType.LOOP:
                for (let trace of originalEventlog) {
                    //Anfangs immer im Do-Part
                    let state: LoopState = LoopState.DO_PART;
                    let tempTrace: string[] = [];

                    for (let activity of trace) {
                        switch (state) {
                            case LoopState.DO_PART:
                                //solange die Aktivität im firstNodeSet vorkommt, gehört sie zum 1. trace
                                if (firstNodeSet.has(activity)) {
                                    tempTrace.push(activity);
                                } else {
                                    // sobald die Aktivität zum 2. Nodeset gehört, ist ein Do-trace erledigt und kommt ins eventlog
                                    this.pushIfTraceNotInEventlog(firstEventlog, tempTrace)
                                    tempTrace = [activity];
                                    state = LoopState.REDO_PART;
                                }
                                break;

                            case LoopState.REDO_PART:
                                //funktioniert spiegelverkehrt von oben
                                if (secondNodeSet.has(activity)) {
                                    tempTrace.push(activity);
                                } else {
                                    this.pushIfTraceNotInEventlog(secondEventlog, tempTrace)
                                    tempTrace = [activity];
                                    state = LoopState.DO_PART;
                                }
                                break;
                        }
                    }
                    // der letzte trace, an dem wir am arbeiten waren wird noch ins eventlog gefügt
                    if (state === LoopState.DO_PART) {
                        this.pushIfTraceNotInEventlog(firstEventlog, tempTrace)
                    } else {
                        this.pushIfTraceNotInEventlog(secondEventlog, tempTrace)
                    }
                }
                return [firstEventlog, secondEventlog];

            default:
                return [[], []]
        }
    }

    private static isTraceInEventlog(eventlog: string[][], trace: string[]): boolean {
        return eventlog.some(array => array.length === trace.length && array.every((value, index) => value === trace[index]));
    }

    public static pushIfTraceNotInEventlog(eventlog: string[][], trace: string[]): void {
        if (this.isTraceInEventlog(eventlog, trace)) {
            return
        }
        eventlog.push(trace)
    }

    public static createSortedNodeSets(data: ValidationData): [Set<string>, Set<string>] {
        // zweites NodeSet durch Differenz mit allen Nodes
        const allNodes = data.dfg.dfg.getNodes();
        const secondNodeSet = new Set<string>([...allNodes].filter(element => !data.firstNodeSet.has(element)));
        // filter play / stop aus dem übergeben NodeSet, falls vorhanden...
        const firstNodeSet = new Set<string>([...data.firstNodeSet].filter(element => !new Set(['play', 'stop']).has(element)))
        if (firstNodeSet?.size > 0 && secondNodeSet?.size > 0) {
            switch (data.cutType) {
                case CutType.LOOP:
                    //Wenn eine Kante play -> firstNodeset existiert, muss das der Do part sein
                    const playNodes = data.dfg.dfg.getPlayNodes();
                    const hasCommonNode = [...firstNodeSet].some(node => playNodes?.has(node));
                    if (hasCommonNode) {
                        return [firstNodeSet, secondNodeSet];
                    } else {
                        return [secondNodeSet, firstNodeSet];
                    }
                case CutType.SEQUENCE:
                    // Wenn ein weg von firstNodeSet nach secondNodeSet führt, muss die Reihenfolge so stimmen
                    if (data.dfg.dfg.existsPath(new Set<string>([firstNodeSet.values().next().value]), secondNodeSet)) {
                        return [firstNodeSet, secondNodeSet];
                    } else {
                        return [secondNodeSet, firstNodeSet];
                    }
                default:
                    return [firstNodeSet, secondNodeSet]
            }
        }
        return [firstNodeSet, secondNodeSet]
    }

    private static hasUndefined(mySet: Set<any>): boolean {
        return mySet.has(undefined);
    }
}
