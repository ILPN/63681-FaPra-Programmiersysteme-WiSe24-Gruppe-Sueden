import {Injectable, signal} from '@angular/core'
import {DirectlyFollows} from '../classes/directly-follows'
import {ValidationData} from '../classes/validation-data'
import {CutType} from "../classes/cut-type.enum";

@Injectable({
    providedIn: 'root'
})
export class ValidationDataService {

    // Signal für die Validierungsdaten
    validationDataSignal = signal<ValidationData | null>(null);

    // Methode zur Aktualisierung der Validierungsdaten
    updateData(dfg: DirectlyFollows, firstNodeSet: Set<string>, secondNodeSet: Set<string>, cutType: CutType) {
        this.validationDataSignal.set({ dfg, firstNodeSet, secondNodeSet, cutType });
    }

    // Methode zur Abrufung der aktuellen Validierungsdaten
    getValidationData() {
        return this.validationDataSignal();
    }
}
