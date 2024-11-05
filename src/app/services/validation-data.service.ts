// validation-data.service.ts
import {Injectable} from '@angular/core'
import {BehaviorSubject} from 'rxjs'
import {DirectlyFollows} from '../classes/directly-follows'
import {ValidationData} from '../classes/validation-data'

@Injectable({
    providedIn: 'root'
})
export class ValidationDataService {
    private dataSubject = new BehaviorSubject<ValidationData | null>(null)
    data$ = this.dataSubject.asObservable()

    // Aktualisiere alle Daten auf einmal
    updateData(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>, cutType: string) {
        this.dataSubject.next({dfg, firstNodeSet, secondNodeSet, cutType})
    }
}
