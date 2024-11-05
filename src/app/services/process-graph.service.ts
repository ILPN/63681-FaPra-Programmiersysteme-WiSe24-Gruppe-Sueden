import {Injectable} from '@angular/core'
import {BehaviorSubject} from 'rxjs'
import {DirectlyFollows} from '../classes/directly-follows'
import {ProcessGraph} from "../classes/process-graph"

@Injectable({
    providedIn: 'root'
})
export class ProcessGraphService {
    private processGraph: ProcessGraph = {
        validationSuccessful: false,
        reason: null,
        dfgSet: new Set<DirectlyFollows>(),
        places: new Set<string>,
        transitions: new Set<string>,
        arcs: [],
        dataUpdated: false,
    }

    private resultSubject = new BehaviorSubject<ProcessGraph>(this.processGraph)
    result$ = this.resultSubject.asObservable()

    updateValidationSuccessful(successful: boolean) {
        this.processGraph.validationSuccessful = successful
        this.resultSubject.next(this.processGraph)
    }

    updateReason(reason: string | null) {
        this.processGraph.reason = reason
        this.resultSubject.next(this.processGraph)
    }

    addDfg(dfg: DirectlyFollows) {
        this.processGraph.dfgSet.add(dfg)
        this.resultSubject.next(this.processGraph)
    }

    removeDfg(dfg: DirectlyFollows) {
        this.processGraph.dfgSet.delete(dfg)
        this.resultSubject.next(this.processGraph)
    }
    setDataUpdated(boo : boolean): void {
        this.processGraph.dataUpdated = boo;
    }
    getDataUpdated(): boolean {
        return this.processGraph.dataUpdated;
    }
}


//TODO: Gesamten Aufbau des results überdenken
/* brauche: boolean (ob letzter cut geklappt), string (Begründung), die neue Menge an DFGs sowie Pertinetz-Teilen*/
