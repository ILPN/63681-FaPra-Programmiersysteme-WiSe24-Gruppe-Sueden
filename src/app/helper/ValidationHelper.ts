import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraphService} from '../services/process-graph.service'
import {ValidationData} from '../classes/validation-data'
import {CutType} from "../classes/cut-type.enum";
import {ValidationResult} from '../classes/validation-result'
import {LoopState} from '../classes/loop-state.enum'


export class ValidationHelper {
    //Nimmt ein ValidationData objekt entgegen und gibt ein Validation result zurück
    // updated mittels Processgraphservice den ... process graph...
    public static cutValidation(data: ValidationData, processGraphService: ProcessGraphService): ValidationResult {
        // sortiere die Reihenfolge der NodeSets für die spätere Parameterübergabe
        let sortedNodes = this.createSortedNodeSets(data)
        const firstNodeSet = sortedNodes[0];
        const secondNodeSet = sortedNodes[1];
        //Rufe Validierung auf
        const result = this.validateAndReturn(data.dfg, firstNodeSet, secondNodeSet, data.cutType);

        // Die Ergebnisse an das ProcessGraphService weitergeben
        processGraphService.batchUpdateProcessGraph(() => {
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
                    processGraphService.incorporateNewDFGs(data.dfg, result[2], firstOptional, result[3], secondOptional, data.cutType);
                }
            }
            //TODO: Eigentlich unnötig --> ich lasse es momentan noch, falls wir doch darauf wechseln wollen.
            processGraphService.updateValidationSuccessful(result[0]);  // update validation successful
            processGraphService.updateReason(result[1]);               // update reason
        });
        return {validationSuccessful: result[0], comment: result[1]};
    }


    private static validateAndReturn(dfg: DirectlyFollows,
                                     firstNodeSet: Set<string>,
                                     secondNodeSet: Set<string>,
                                     cutType: CutType): [boolean, string, DirectlyFollows?, DirectlyFollows?] {
        const validationResult: [boolean, string] = this.validator(dfg, firstNodeSet, secondNodeSet, cutType)
        if (!validationResult[0]) {
            return validationResult
        }
        let dfg1: DirectlyFollows = this.createNewDFG(dfg, firstNodeSet)
        let dfg2: DirectlyFollows = this.createNewDFG(dfg, secondNodeSet)
        let splitEventlogs = this.splitEventlogs(dfg, firstNodeSet, secondNodeSet, cutType);
        dfg1.setEventLog(splitEventlogs[0]);
        dfg2.setEventLog(splitEventlogs[1]);
        return [true, cutType, dfg1, dfg2]
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
        if (!firstNodeSet || !secondNodeSet || firstNodeSet.size === 0 || secondNodeSet.size === 0) {
            return [false, "Ein übergebenes NodeSet ist leer"];
        }
        if (!this.allNodesUsedValidation(dfg, firstNodeSet, secondNodeSet)) {
            return [false, "Es müssen alle Knoten in den Mengen vorkommen und sie müssen exklusiv sein"]
        }
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
        return [false, "anderer Fehler"]
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
        for (let nodeFirst of firstNodeSet) {
            let nodeFirstSuccessors = dfg.getSuccessors(nodeFirst)
            if (nodeFirstSuccessors) {
                for (let nodeFirstSuccessor of nodeFirstSuccessors) {
                    if (secondNodeSet.has(nodeFirstSuccessor)) {
                        return [false, `Kante von ${nodeFirst} nach ${nodeFirstSuccessor} gefunden`]
                    }
                }
            }
        }
        //Prüfe, ob keine Kanten von Knotenmenge 2 nach Knotenmenge 1
        for (let nodeSecond of secondNodeSet) {
            let nodeSecondSuccessors = dfg.getSuccessors(nodeSecond)
            if (nodeSecondSuccessors) {
                for (let nodeSecondSuccessor of nodeSecondSuccessors) {
                    if (firstNodeSet.has(nodeSecondSuccessor)) {
                        return [false, `Kante von ${nodeSecond} nach ${nodeSecondSuccessor} gefunden`]
                    }
                }
            }
        }
        return [true, 'XOR-Cut erfolgreich']
    }

    //Prüft auf Sequence-Cut
    private static sequenceValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        //Prüfe, ob von allen Knoten der ersten Knotenmenge auch ein Weg in die zweite Knotenmenge führt
        for (let nodeFirst of firstNodeSet) {
            for (let nodeSecond of secondNodeSet) {
                if (!dfg.existsPath(new Set([nodeFirst]), new Set([nodeSecond]))) {
                    return [false, `Kein Weg von ${nodeFirst} nach ${nodeSecond} gefunden`]
                }
            }
        }
        // Prüfe, dass kein Weg von Knotenmenge 2 in Knotenmenge 1 führt
        for (let nodeSecond of secondNodeSet) {
            if (dfg.existsPath(new Set([nodeSecond]), firstNodeSet)) {
                return [false, `Weg von ${nodeSecond} in erste Knotenmenge gefunden`]
            }
        }
        return [true, 'Sequence-Cut erfolgreich']
    }

    private static parallelValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        for (let nodeFirst of firstNodeSet) {
            let arcsOfSource = dfg.getArcsOfSourceNode(nodeFirst);
            let targetsOfSource = new Set(arcsOfSource.map(arc => arc.target as string));
            for (const nodeSecond of secondNodeSet) {
                if (!targetsOfSource.has(nodeSecond)) {
                    return [false, `Keine Kante zwischen ${nodeFirst} und ${nodeSecond} gefunden`];
                }
            }
            if (!dfg.existsFullPathOverNode(nodeFirst, firstNodeSet)) {
                return [false, `Kein Weg play -> ${nodeFirst} -> stop gefunden, der nur über die eigene Knotenmenge geht`];
            }
        }
        for (let nodeSecond of secondNodeSet) {
            let arcsOfSource = dfg.getArcsOfSourceNode(nodeSecond);
            let targetsOfSource = new Set(arcsOfSource.map(arc => arc.target as string));
            for (const nodeFirst of firstNodeSet) {
                if (!targetsOfSource.has(nodeFirst)) {
                    return [false, `Keine Kante zwischen ${nodeSecond} und ${nodeFirst} gefunden`];
                }
            }
            if (!dfg.existsFullPathOverNode(nodeSecond, secondNodeSet)) {
                return [false, `Kein Weg play -> ${nodeSecond} -> stop gefunden, der nur über die eigene Knotenmenge geht`];
            }
        }
        return [true, 'Parallel-Cut erfolgreich']
    }


    private static loopValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string] {
        //erstelle die verschiedenen play/stop mengen
        let firstNodeSetPlay = this.createPlaySet(dfg, firstNodeSet);
        let firstNodeSetStop = this.createStopSet(dfg, firstNodeSet)
        let secondNodeSetPlay = this.createPlaySet(dfg, secondNodeSet);
        let secondNodeSetStop = this.createStopSet(dfg, secondNodeSet);

        //Validiere ob alle Kanten von play nach firstNodeSetPlay gehen
        let playNodes = dfg.getPlayNodes();
        if (playNodes) {
            for (const node of playNodes) {
                if (!firstNodeSetPlay.has(node)) {
                    return [false, `Kante führt von play nach ${node}`];
                }
            }
        }
        //Validiere ob alle Kanten nach stop von firstNodeSetStop ausgehen
        let stopNodes = dfg.getStopNodes();
        if (stopNodes) {
            for (const node of stopNodes) {
                if (!firstNodeSetStop.has(node)) {
                    return [false, `Kante führt von ${node} nach stop`]
                }
            }
        }
        //Validiere ob es für alle Knoten von secondNodeSetStop vereinigt mit play eine Kante zu jedem Knoten aus firstNodeSetPlay gibt
        let playWithSecondNodeSetStop: Set<string> = new Set(secondNodeSetStop);
        playWithSecondNodeSetStop.add('play');
        for (let node1 of playWithSecondNodeSetStop) {
            let node1Successors = dfg.getSuccessors(node1);
            // gehe alle Nachfolger von Ausgangsknoten ab und ob alle Knoten aus firstNodeSetPlay enthalten
            for (let node2 of firstNodeSetPlay) {
                // falls eine Kante nicht gefunden return false
                if (!node1Successors?.has(node2)) {
                    return [false, `Es wurde zwischen ${node1} und ${node2} keine Kante gefunden333`];
                }
            }
        }
        //Validiere ob es für alle Knoten von firstNodeSetStop eine Kante nach stop und allen secondNodeSetPlay gibt
        let stopWithSecondNodeSetPlay: Set<string> = new Set(secondNodeSetPlay);
        stopWithSecondNodeSetPlay.add('stop');
        for (let node1 of firstNodeSetStop) {
            let node1Successors = dfg.getSuccessors(node1)
            // gehe alle Nachfolger von Ausgangsknoten ab und schau, ob stop und secondNodeSetPlay enthalten sind
            for (let node2 of stopWithSecondNodeSetPlay) {
                // falls eine Kante nicht gefunden return false
                if (!node1Successors?.has(node2)) {
                    return [false, `Es wurde zwischen ${node1} und ${node2} keine Kante gefunden`]
                }
            }
        }
        return [true, 'Loop-Cut erfolgreich']
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
                        firstEventlog.push(trace)
                    } else {
                        secondEventlog.push(trace)
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
                            firstEventlog.push(trace.slice(0, tempIterator));
                            secondEventlog.push(trace.slice(tempIterator, trace.length));
                            break
                        }
                        if (tempIterator == trace.length - 1) {
                            firstEventlog.push(trace)
                        }
                    }
                }
                return [firstEventlog, secondEventlog]

            case CutType.PARALLEL:
                //es werden alle traces durchlaufen und 2 temp-traces erstellt
                for (let trace of originalEventlog) {
                    let tempTraceFirst: string[] = trace.filter(activity => firstNodeSet.has(activity));
                    let tempTraceSecond: string[] = trace.filter(activity => secondNodeSet.has(activity));
                    firstEventlog.push(tempTraceFirst);
                    secondEventlog.push(tempTraceSecond);
                }
                return [firstEventlog, secondEventlog]

            // In der Ausgabe ist im firstEventlog der Do-Part und in secondEventlog der Redo-Part
            case CutType.LOOP:
                for (let trace of originalEventlog) {
                    //Anfangs immer im Do-Part
                    let state: LoopState = LoopState.DO_PART;
                    let tempTrace: string[] = [];

                    for (let activity of trace) {
                        switch (state){
                            case LoopState.DO_PART:
                                //solange die Aktivität im firstNodeSet vorkommt, gehört sie zum 1. trace
                                if (firstNodeSet.has(activity)) {
                                    tempTrace.push(activity);
                                } else {
                                    // sobald die Aktivität zum 2. Nodeset gehört, ist ein Do-trace erledigt und kommt ins eventlog
                                    firstEventlog.push(tempTrace);
                                    tempTrace = [activity];
                                    state = LoopState.REDO_PART;
                                }
                                break;

                            case LoopState.REDO_PART:
                                //funktioniert spiegelverkehrt von oben
                                if (secondNodeSet.has(activity)) {
                                    tempTrace.push(activity);
                                } else {
                                    secondEventlog.push(tempTrace);
                                    tempTrace = [activity];
                                    state = LoopState.DO_PART;
                                }
                                break;
                        }
                    }
                    // der letzte trace, an dem wir am arbeiten waren wird noch ins eventlog gefügt
                    if (state === LoopState.DO_PART) {
                        firstEventlog.push(tempTrace);
                    } else {
                        secondEventlog.push(tempTrace);
                    }
                }
                return [firstEventlog, secondEventlog];

            default:
                return [[], []]
        }
    }

    private static createSortedNodeSets(data: ValidationData): [Set<string>, Set<string>] {
        // zweites NodeSet durch Differenz mit allen Nodes
        const allNodes = data.dfg.getNodes();
        const secondNodeSet = new Set<string>([...allNodes].filter(element => !data.firstNodeSet.has(element)));
        // filter play / stop aus dem übergeben NodeSet, falls vorhanden...
        const firstNodeSet = new Set<string>([...data.firstNodeSet].filter(element => !new Set(['play', 'stop']).has(element)))
        if (firstNodeSet?.size > 0 && secondNodeSet?.size > 0) {
            switch (data.cutType) {
                case CutType.LOOP:
                    //Wenn eine Kante play -> firstNodeset existiert, muss das der Do part sein
                    const playNodes = data.dfg.getPlayNodes();
                    const hasCommonNode = [...firstNodeSet].some(node => playNodes?.has(node));
                    if (hasCommonNode) {
                        return [firstNodeSet, secondNodeSet];
                    } else {
                        return [secondNodeSet, firstNodeSet];
                    }
                case CutType.SEQUENCE:
                    // Wenn ein weg von firstNodeSet nach secondNodeSet führt, muss die Reihenfolge so stimmen
                    if (data.dfg.existsPath(new Set<string>([firstNodeSet.values().next().value]), secondNodeSet)) {
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
}
