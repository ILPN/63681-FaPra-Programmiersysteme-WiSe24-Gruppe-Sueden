import {Injectable, computed} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ValidationDataService} from './validation-data.service'
import {ProcessGraphService} from './process-graph.service'
import {CutType} from "../classes/cut-type.enum";

@Injectable({
    providedIn: 'root'
})
export class ValidationService {

    constructor(

        private validationDataService: ValidationDataService,
        private processGraphService: ProcessGraphService
    ) {
        //sollte auf Änderungen bei validationDataSignal reagieren
        computed(() => {
            const data = this.validationDataService.validationDataSignal();
            if (data) {
                // Validierung durchführen
                const result = this.validateAndReturn(data.dfg, data.firstNodeSet, data.secondNodeSet, data.cutType);

                // Die Ergebnisse an das ProcessGraphService weitergeben
                this.processGraphService.batchUpdateProcessGraph(graph => {
                    graph.reason = result[1];
                    graph.validationSuccessful = result[0];
                    // Falls valider cut füge neue DFG hinzu und lösche alten
                    //TODO: richtige Verknüpfung mit Stellen und Transitionen bis jetzt werden nur die DFG hinzugefügt..
                    if (result[0]) {
                        if (result[2]) {
                            graph.dfgSet.add(result[2]);
                        }
                        if (result[3]) {
                            graph.dfgSet.add(result[3])
                        }
                        graph.dfgSet.delete(data.dfg);
                    }
                    graph.dataUpdated = true;
                })
            }
        });
    }


    //TODO: muss noch Verkettung der DFG Rückgeben, ob parallel, sequenziell usw usf
    validateAndReturn(dfg: DirectlyFollows,
                      firstNodeSet: Set<string>,
                      secondNodeSet: Set<string>,
                      cutType: CutType): [boolean, string | null, DirectlyFollows?, DirectlyFollows?] {
        const validationResult: [boolean, string | null] = this.validator(dfg, firstNodeSet, secondNodeSet, cutType)
        if (!validationResult[0]) {
            return validationResult
        }
        let dfg1: DirectlyFollows = this.createNewDFG(dfg, firstNodeSet)
        let dfg2: DirectlyFollows = this.createNewDFG(dfg, secondNodeSet)
        return [true, cutType, dfg1, dfg2]
    }

    //TODO: Eventlog abändern und einfügen
    private createNewDFG(dfg: DirectlyFollows, nodeSet: Set<string>): DirectlyFollows {
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
        //TODO: EVENTLOG
        // resultDFG.setEventLog(inputStringArray);
        resultDFG.setNodes();
        resultDFG.generateArcs();
        return resultDFG
    }


    //Nimmt als eingabe einen DFG, 2 Knotenmengen sowie die Cutmethode als string, prüft den cut und gibt true, bzw false mit einem String als Begründung aus
    private validator(dfg: DirectlyFollows,
                      firstNodeSet: Set<string>,
                      secondNodeSet: Set<string>,
                      cutType: string): [boolean, string | null] {
        if (firstNodeSet.size === 0) {
            return [false, "Erstes Node-Set ist leer"];
        }
        if (secondNodeSet.size === 0) {
            return [false, "Zweites Node-Set ist leer"];
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

    private allNodesUsedValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): boolean {
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
    private xorValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string | null] {
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
        return [true, null]
    }

    //TODO: Prüfen ob direkter Weg start -> Knotenmenge 2 ==> Knotenmenge1 Optional ==> wie rückgabe?
    // Prüft auf Sequence-Cut
    private sequenceValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string | null] {
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
        return [true, null]
    }

    private parallelValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string | null] {
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
        return [true, null]
    }

    //TODO: sicherstellen, dass firstNodeSet den Weg play->firstNodeSet->stop hat. Ansonsten Mengen tauschen??
    private loopValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string | null] {
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
        return [true, null]
    }

    //Erstellt ein Set an Knoten, zu denen mind. eine Kante führt, die nicht aus der eigenen Menge stammt
    private createPlaySet(dfg: DirectlyFollows, nodeSet: Set<string>): Set<string> {
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

    private createStopSet(dfg: DirectlyFollows, nodeSet: Set<string>): Set<string> {
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

    //
    private splitEventlogs(originalDFG: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>, cutType: CutType): [string[][],string[][]]{
        let originalEventlog = originalDFG.getEventLog();
        let firstEventlog : string[][] = [];
        let secondEventlog : string[][] = [];
        switch (cutType) {
            case CutType.XOR:
                for (let trace of originalEventlog){
                    if(firstNodeSet.has(trace[0])) {
                        firstEventlog.push(trace)
                    }
                    else {
                        secondEventlog.push(trace)
                    }
                }
                return [firstEventlog, secondEventlog]

            //Funktioniert nur, wenn firstNodeSet mit Play verbunden ist??
            case CutType.SEQUENCE:
                for (let trace of originalEventlog){
                    let tempIterator = 0;
                    for (let activity of trace) {
                        if (secondNodeSet.has(activity)) {
                            firstEventlog.push(trace.slice(0, tempIterator));
                            secondEventlog.push(trace.slice(tempIterator,trace.length));
                            break
                        }
                    }
                }
                return [firstEventlog, secondEventlog]
            case CutType.PARALLEL:
                for (let trace of originalEventlog){
                    let tempTraceFirst: string[] = [];
                    let tempTraceSecond : string[] = [];
                    for (let activity of trace){
                        if (firstNodeSet.has(activity)) {
                            tempTraceFirst.push(activity)
                        } else {
                            tempTraceSecond.push(activity)
                        }
                    }
                    firstEventlog.push(tempTraceFirst);
                    secondEventlog.push(tempTraceSecond);
                }
                return [firstEventlog, secondEventlog]
            case CutType.LOOP:
                for (let trace of originalEventlog) {
                    let tempTraceFirst: string[] = [];
                    let tempTraceSecond: string[] = [];
                    let isDoPart: boolean = true;
                    for (let activity of trace) {
                        if (isDoPart) {
                            if (firstNodeSet.has(activity)) {
                                tempTraceFirst.push(activity);
                            } else {
                                firstEventlog.push(tempTraceFirst);
                                tempTraceFirst=[]; // Logik überdenken
                                isDoPart = false;
                                tempTraceSecond.push(activity);
                            }
                        } else {
                            //TODO: wieder aus REDO part zurückwechseln - in eventlog pushen

                        }
                    }
                }
                return [firstEventlog, secondEventlog];
            default:
                return [[],[]]

        }

    }



}
