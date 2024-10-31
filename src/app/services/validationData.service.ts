// validation-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DirectlyFollows } from '../classes/directlyFollows';
import { ValidationData } from '../classes/validationData.interface';

@Injectable({
    providedIn: 'root'
})
export class ValidationDataService {
    private dataSubject = new BehaviorSubject<ValidationData | null>(null);
    data$ = this.dataSubject.asObservable();

    // Aktualisiere alle Daten auf einmal
    updateData(dfg: DirectlyFollows, knotenMengeA: Set<string>, knotenMengeB: Set<string>, cut: string) {
        this.dataSubject.next({ dfg, knotenMengeA, knotenMengeB, cut });
    }
}
