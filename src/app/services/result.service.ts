import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {DirectlyFollows} from '../classes/directlyFollows';

@Injectable({
    providedIn: 'root'
})
export class ResultService {
    private resultSubject = new BehaviorSubject<[boolean, string | null, DirectlyFollows?, DirectlyFollows?] | null>(null);
    result$ = this.resultSubject.asObservable();

    updateResult(result: [boolean, string | null, DirectlyFollows?, DirectlyFollows?]) {
        this.resultSubject.next(result);
    }
}


//TODO: Gesamten Aufbau des results überdenken
/* brauche: boolean (ob letzter cut geklappt), string (Begründung), die neue Menge an DFGs sowie Pertinetz-Teilen*/
