import { TestBed } from '@angular/core/testing';
import { ValidationDataService } from './validation-data.service';
import { DirectlyFollows } from '../classes/directly-follows';
import { CutType } from '../classes/cut-type.enum';

describe('ValidationDataService', () => {
    let service: ValidationDataService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ValidationDataService],  // Füge hier den Service explizit hinzu
        });
        service = TestBed.inject(ValidationDataService);
    });


    it('should update validation data correctly', () => {
        const dfg = new DirectlyFollows();
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'B', 'C', 'D', 'B', 'C'],
            ['E', 'F'],
            ['G', 'H', 'I', 'K'],
            ['G', 'H', 'J', 'K'],
            ['L', 'M', 'N'],
            ['L', 'M', 'O']
        ];
        dfg.setDFGfromStringArray(inputStringArray);
        const firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
        const secondNodeSet = new Set(['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']);
        const cutType = CutType.XOR;

        // Simuliere das Setzen der Validierungsdaten
        service.updateData(dfg, firstNodeSet, secondNodeSet, cutType);

        // Prüfe, ob das Signal aktualisiert wurde
        const validationData = service.getValidationData();
        expect(validationData).toBeTruthy();
        expect(validationData?.dfg).toBe(dfg);
        expect(validationData?.firstNodeSet).toEqual(firstNodeSet);
        expect(validationData?.secondNodeSet).toEqual(secondNodeSet);
        expect(validationData?.cutType).toBe(cutType);
    });
});
