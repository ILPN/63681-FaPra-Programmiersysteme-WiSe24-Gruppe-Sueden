import {Injectable} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ValidationDataService} from './validation-data.service'
import {ProcessGraphService} from './process-graph.service'

@Injectable({
    providedIn: 'root'
})
export class ValidationService {

    constructor(
        private validationDataService: ValidationDataService,
        private processGraphService: ProcessGraphService
    ) {
        this.validationDataService.data$.subscribe(data => {
            if (data) {
                const result = this.validateAndReturn(data.dfg, data.firstNodeSet, data.secondNodeSet, data.cutType)
                this.processGraphService.updateValidationSuccessful(result[0])
                this.processGraphService.updateReason(result[1])
                if (result[0]) {
                    if (result[2]) {
                        this.processGraphService.addDfg(result[2])
                    }
                    if (result[3]) {
                        this.processGraphService.addDfg(result[3])
                    }
                    this.processGraphService.removeDfg(data.dfg)
                }
            }
        })
    }


    //TODO: muss noch verknüpfung der DFG Rückgeben, ob parallel, sequenziell usw usf
    validateAndReturn(dfg: DirectlyFollows,
                      firstNodeSet: Set<string>,
                      secondNodeSet: Set<string>,
                      cutType: string): [boolean, string | null, DirectlyFollows?, DirectlyFollows?] {
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
        resultDFG.createPredecessorMap()
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
            case "xor": {
                return this.xorValidation(dfg, firstNodeSet, secondNodeSet)
            }
            case "parallel": {
                break
            }
            case "sequence": {
                break
            }
            case "loop": {
                break
            }
            default: {
                break
            }
        }
        return [false, "anderer Fehler"]


    }

    private allNodesUsedValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): boolean {
        //Prüfe, ob Schnittmenge leer
        let intersection = new Set<string>([...firstNodeSet].filter(element => secondNodeSet.has(element)))
        if (intersection.size !== 0) {
            console.log("Schnitt nicht leer")
            return false
        }
        // Prüfe ob Vereinigung alle Schlüssel der Map enthält
        let union = new Set<string>([...firstNodeSet, ...secondNodeSet])
        for (let node of dfg.getNodes()) {
            if (!union.has(node)) {
                console.log("Knoten fehlt")
                return false //Schlüssel nicht in Knotenmenge Vorhanden
            }
        }
        return true
    }

    private xorValidation(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>): [boolean, string | null] {
        //Prüfe, ob keine Kanten von Knotenmenge 1 nach Knotenmenge 2
        for (let nodeFirst of firstNodeSet) {
            let nodeFirstSuccessors = dfg.getSuccessor(nodeFirst)
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
            let nodeSecondSuccessors = dfg.getSuccessor(nodeSecond)
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


}
