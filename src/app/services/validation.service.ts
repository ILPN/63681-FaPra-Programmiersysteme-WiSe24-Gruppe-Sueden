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
        nodeSet.add("play")
        nodeSet.add("stop")
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
        let firstNodeSetPlay = this.erstellePlaySet(dfg, firstNodeSet);
        let firstNodeSetStop = this.erstelleStopSet(dfg, firstNodeSet)
        let secondNodeSetPlay = this.erstellePlaySet(dfg, secondNodeSet);
        let secondNodeSetStop = this.erstelleStopSet(dfg, secondNodeSet);
        //Validiere ob alle Kanten von play nach firstNodeSetPlay gehen
        let playNodes = dfg.getPlayNodes();
        if (playNodes) {
            for (const node of playNodes) {
                if (!firstNodeSetPlay.has(node)) {
                    return [false, `Kante führt von play nach ${node}`];
                }
            }
        }
        //Validiere ob alle Kanten nach play von firstNodeSetStop ausgehen
        let stopNodes = dfg.getStopNodes();
        if (stopNodes) {
            for (const node of stopNodes) {
                if (!firstNodeSetStop.has(node)) {
                    return [false, `Kante führt von ${node} nach stop`]
                }
            }
        }
        //Validiere ob alle Kanten von firstNodeSetStop nach stop oder secondNodeSetPlay führen
        for (let node of firstNodeSetStop) {
            let successorNodes = dfg.getSuccessors(node);
            if (successorNodes) {
                for (let successor of successorNodes) {
                    if (secondNodeSetPlay.has(successor) || successor == "stop") {
                        continue;
                    }
                    return [false, `Es wurde zu ${node} ein Nachfolger gefunden, der nicht zu Stop oder zu der play-Menge der zweiten KnotenMenge gehört`]
                }
            }
        }
        //Validiere, ob alle Kanten von secondNodeSetStop firstNodeSetPlay führen
        for (let node of secondNodeSetStop) {
            let successorNodes = dfg.getSuccessors(node);
            if (successorNodes) {
                for (let successor of successorNodes) {
                    if (firstNodeSetPlay.has(successor)) {
                        continue;
                    }
                    return [false, `Ein Nachfolger von ${node} liegt nicht in der play-Menge der ersten Knotenmenge`]
                }
            }
        }
        return [true, null]
    }

    private erstellePlaySet(dfg: DirectlyFollows, nodeSet: Set<string>): Set<string> {
        let resultSet = new Set<string>();
        for (const node of nodeSet) {
            const predecessors = dfg.getPredecessors(node);
            if (predecessors) {
                let noPredecessorInSet = true;
                for (let predecessor of predecessors) {
                    if (nodeSet.has(predecessor)) {
                        noPredecessorInSet = false;
                        break
                    }
                }
                if (noPredecessorInSet) {
                    resultSet.add(node);
                }
            }
        }
        return resultSet
    }

    private erstelleStopSet(dfg: DirectlyFollows, nodeSet: Set<string>): Set<string> {
        let resultSet = new Set<string>();
        for (const node of nodeSet) {
            const successors = dfg.getSuccessors(node);
            if (successors) {
                let noSuccessorInSet = true;
                for (let successor of successors) {
                    if (nodeSet.has(successor)) {
                        noSuccessorInSet = false;
                        break
                    }
                }
                if (noSuccessorInSet) {
                    resultSet.add(node);
                }
            }
        }
        return resultSet
    }


}
