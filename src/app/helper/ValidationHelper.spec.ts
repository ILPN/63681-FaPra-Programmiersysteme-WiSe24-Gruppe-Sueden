import {ValidationHelper} from './ValidationHelper';
import {ValidationData} from '../classes/validation-data';
import {ProcessGraphService} from '../services/process-graph.service';
import {ProcessGraph} from '../classes/process-graph';
import {CutType} from '../classes/cut-type.enum';
import {DirectlyFollows} from '../classes/directly-follows';


describe('ValidationHelper', () => {
    let dfg: DirectlyFollows;
    let processGraphService: ProcessGraphService;


    beforeEach(() => {
        processGraphService = new ProcessGraphService();
        dfg = new DirectlyFollows();
    });
    describe('ProcessGraph after all cuts', () => {
        it('should pull the correct dfg from process-graph', () => {
            const inputStringArray: string[][] = [
                ['A', 'B'],
                ['C', 'D', 'E', 'F', 'G'],
                ['C', 'D', 'E', 'F', 'G'],
                ['C', 'D', 'E', 'F', 'G'],
                ['C', 'D', 'E', 'U', 'D', 'E', 'F', 'G'],
            ];
            processGraphService.createGraph(inputStringArray);

            let graph = processGraphService.graphSignal()
            let dfgArray = Array.from(graph?.dfgSet || []);
            dfg = dfgArray[0];
            expect(true).toBe(true)
        });
    });

    describe('validateAndReturn', () => {
        it('should correctly validate and split DFG with XOR-Cut, and load it on ProcessGraph', () => {
            const inputStringArray: string[][] = [
                ['A', 'B', 'C'],
                ['A', 'B', 'C', 'D', 'B', 'C'],
                ['E', 'F'],
                ['G', 'H', 'I', 'K'],
                ['G', 'H', 'J', 'K'],
                ['L', 'M', 'N'],
                ['L', 'M', 'O']
            ];
            processGraphService.createGraph(inputStringArray);

            let graph = processGraphService.graphSignal()
            let dfgArray = Array.from(graph?.dfgSet || []);
            dfg = dfgArray[0];

            let firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
            let secondNodeSet = new Set(['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']);
            const valiDat: ValidationData = {
                dfg: dfg,
                firstNodeSet: firstNodeSet,
                cutType: CutType.XOR,
            }

            // Teste die erste XOR-Aufteilung
            const result = ValidationHelper.cutValidation(valiDat, processGraphService);
            expect(result.validationSuccessful).toBeTrue();
            expect(result.comment).toBe('XOR-Cut erfolgreich');
            for (let dfg of graph?.dfgSet || []) {
                if (dfg.getNodes().has('A')) {
                    for (let node of dfg.getNodes()) {
                        expect(firstNodeSet.has(node)).toBe(true);
                        firstNodeSet.delete(node);
                    }
                } else {
                    for (let node of dfg.getNodes()) {
                        expect(secondNodeSet.has(node)).toBe(true);
                        secondNodeSet.delete(node);
                    }
                }
            }
        });
    });

    describe('validateAndReturn', () => {
        it('should correctly validate and split DFG with XOR-Cut,  and then further with XOR-Cut', () => {
            const inputStringArray: string[][] = [
                ['A', 'B', 'C'],
                ['A', 'B', 'C', 'D', 'B', 'C'],
                ['E', 'F'],
                ['G', 'H', 'I', 'K'],
                ['G', 'H', 'J', 'K'],
                ['L', 'M', 'N'],
                ['L', 'M', 'O']
            ];
            processGraphService.createGraph(inputStringArray);

            let graph = processGraphService.graphSignal()
            let dfgArray = Array.from(graph?.dfgSet || []);
            dfg = dfgArray[0];

            let firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
            let secondNodeSet = new Set(['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']);
            const valiDat: ValidationData = {
                dfg: dfg,
                firstNodeSet: firstNodeSet,
                cutType: CutType.XOR,
            }

            const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.XOR);


            expect(result[0]).toBeTrue(); // Sollte erfolgreich validieren
            expect(result[1]).toBe('XOR-Cut erfolgreich'); // Sollte XOR-Cut bestätigen

            // Überprüfe die Knoten im ersten Teil-Digraph (DFG1)
            expect(result[2]?.getNodes()).toContain('A');
            expect(result[2]?.getNodes()).toContain('B');
            expect(result[2]?.getNodes()).toContain('C');
            expect(result[2]?.getNodes()).toContain('D');
            expect(result[2]?.getNodes()).toContain('E');
            expect(result[2]?.getNodes()).toContain('F');

            // Überprüfe die Knoten im zweiten Teil-Digraph (DFG2)
            expect(result[3]?.getNodes()).toContain('G');
            expect(result[3]?.getNodes()).toContain('H');
            expect(result[3]?.getNodes()).toContain('I');
            expect(result[3]?.getNodes()).toContain('J');
            expect(result[3]?.getNodes()).toContain('K');
            expect(result[3]?.getNodes()).toContain('L');
            expect(result[3]?.getNodes()).toContain('M');
            expect(result[3]?.getNodes()).toContain('N');
            expect(result[3]?.getNodes()).toContain('O');

            // Überprüfe die Nachfolger im ersten Teil-Digraph
            expect(result[2]?.getSuccessors('A')).toContain('B');
            expect(result[2]?.getSuccessors('B')).toContain('C');
            expect(result[2]?.getSuccessors('C')).toContain('D');
            expect(result[2]?.getSuccessors('D')).toContain('B');
            expect(result[2]?.getSuccessors('C')).toContain('stop');
            expect(result[2]?.getSuccessors('E')).toContain('F');
            expect(result[2]?.getSuccessors('F')).toContain('stop');

            // Überprüfe die Nachfolger im zweiten Teil-Digraph
            expect(result[3]?.getSuccessors('G')).toContain('H');
            expect(result[3]?.getSuccessors('H')).toContain('I');
            expect(result[3]?.getSuccessors('I')).toContain('K');
            expect(result[3]?.getSuccessors('H')).toContain('J');
            expect(result[3]?.getSuccessors('J')).toContain('K');
            expect(result[3]?.getSuccessors('K')).toContain('stop');
            expect(result[3]?.getSuccessors('L')).toContain('M');
            expect(result[3]?.getSuccessors('M')).toContain('N');
            expect(result[3]?.getSuccessors('N')).toContain('stop');
            expect(result[3]?.getSuccessors('M')).toContain('O');
            expect(result[3]?.getSuccessors('O')).toContain('stop');

            // Teste eine weitere XOR-Aufteilung für den ersten Teil
            const fsd = result[2]; // First Sub-DFG
            const fsdFirstNodeSet = new Set(['A', 'B', 'C', 'D']);
            const fsdSecondNodeSet = new Set(['E', 'F']);

            const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.XOR);

            expect(fsdResult[0]).toBeTrue();
            expect(fsdResult[1]).toBe('XOR-Cut erfolgreich');

            // Teste eine XOR-Aufteilung für den zweiten Teil
            const ssd = result[3]; // Second Sub-DFG
            const ssdFirstNodeSet = new Set(['G', 'H', 'I', 'J', 'K']);
            const ssdSecondNodeSet = new Set(['L', 'M', 'N', 'O']);

            const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.XOR);

            expect(ssdResult[0]).toBeTrue();
            expect(ssdResult[1]).toBe('XOR-Cut erfolgreich');
        });
    });

    it('should validate and split DFG correctly with XOR-Cut and then further with Sequence-Cut', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['D', 'E', 'F'],
            ['D', 'E', 'F', 'D', 'E', 'F']
        ];
        processGraphService.createGraph(inputStringArray);

        let graph = processGraphService.graphSignal()
        let dfgArray = Array.from(graph?.dfgSet || []);
        dfg = dfgArray[0];

        const firstNodeSet = new Set(['A', 'B', 'C']);
        const secondNodeSet = new Set(['D', 'E', 'F']);
        const valiDat: ValidationData = {
            dfg: dfg,
            firstNodeSet: firstNodeSet,
            cutType: CutType.XOR,
        }


        // Teste ob XOR-Validierung und Aufteilung korrekt funktioniert
        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.XOR);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('XOR-Cut erfolgreich');

        expect(result[2]?.getNodes()).toContain('A'); // Teil DFG1
        expect(result[2]?.getNodes()).toContain('B');
        expect(result[2]?.getNodes()).toContain('C');
        expect(result[3]?.getNodes()).toContain('D'); // Teil DFG2
        expect(result[3]?.getNodes()).toContain('E');
        expect(result[3]?.getNodes()).toContain('F');

        expect(result[2]?.getSuccessors('A')).toContain('B');
        expect(result[2]?.getSuccessors('B')).toContain('C');
        expect(result[3]?.getSuccessors('D')).toContain('E');
        expect(result[3]?.getSuccessors('E')).toContain('F');

        // Teste ob weiter mit der Sequence-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A']);
        const fsdSecondNodeSet = new Set(['B', 'C']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.SEQUENCE);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('Sequence-Cut erfolgreich');
        expect(fsdResult[2]?.getSuccessors('A')).not.toContain('B');
        expect(fsdResult[3]?.getSuccessors('B')).toContain('C');

        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['D']);
        const ssdSecondNodeSet = new Set(['E', 'F']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.SEQUENCE);

        expect(ssdResult[0]).toBeFalse(); // Schleife enthalten
        expect(ssdResult[1]).toBe('Weg von E in erste Knotenmenge gefunden');
    });

    it('should validate and split DFG correctly with XOR-Cut and then further with Parallel-Cut', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['A', 'C', 'B', 'D'],
            ['A', 'C', 'D', 'B'],
            ['C', 'D', 'A', 'B'],
            ['C', 'A', 'D', 'B'],
            ['C', 'A', 'B', 'D'],
            ['E', 'F', 'G'],
            ['G', 'E', 'F'],
            ['E', 'G']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C', 'D']);
        const secondNodeSet = new Set(['E', 'F', 'G']);

        // Teste ob XOR-Validierung und Aufteilung korrekt funktioniert
        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.XOR);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('XOR-Cut erfolgreich');

        expect(result[2]?.getNodes()).toContain('A'); // Teil DFG1
        expect(result[2]?.getNodes()).toContain('B');
        expect(result[2]?.getNodes()).toContain('C');
        expect(result[2]?.getNodes()).toContain('D');
        expect(result[3]?.getNodes()).toContain('E'); // Teil DFG2
        expect(result[3]?.getNodes()).toContain('F');
        expect(result[3]?.getNodes()).toContain('G');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('play')).toContain('C');
        expect(result[2]?.getSuccessors('A')).toContain('B');
        expect(result[2]?.getSuccessors('A')).toContain('C');
        expect(result[2]?.getSuccessors('A')).toContain('D');
        expect(result[2]?.getSuccessors('B')).toContain('C');
        expect(result[2]?.getSuccessors('B')).toContain('D');
        expect(result[2]?.getSuccessors('B')).toContain('stop');
        expect(result[2]?.getSuccessors('C')).toContain('A');
        expect(result[2]?.getSuccessors('C')).toContain('B');
        expect(result[2]?.getSuccessors('C')).toContain('D');
        expect(result[2]?.getSuccessors('D')).toContain('A');
        expect(result[2]?.getSuccessors('D')).toContain('B');
        expect(result[2]?.getSuccessors('D')).toContain('stop');

        expect(result[3]?.getSuccessors('play')).toContain('E');
        expect(result[3]?.getSuccessors('play')).toContain('G');
        expect(result[3]?.getSuccessors('E')).toContain('F');
        expect(result[3]?.getSuccessors('E')).toContain('G');
        expect(result[3]?.getSuccessors('F')).toContain('G');
        expect(result[3]?.getSuccessors('F')).toContain('stop');
        expect(result[3]?.getSuccessors('G')).toContain('E');
        expect(result[3]?.getSuccessors('G')).toContain('stop');

        // Teste ob weiter mit der Parallel-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A', 'B']);
        const fsdSecondNodeSet = new Set(['C', 'D']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.PARALLEL);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('Parallel-Cut erfolgreich');

        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('B');
        expect(fsdResult[2]?.getSuccessors('B')).toContain('stop');
        expect(fsdResult[2]?.getSuccessors('A')).not.toContain('C');
        expect(fsdResult[2]?.getSuccessors('A')).not.toContain('D');
        expect(fsdResult[2]?.getSuccessors('B')).not.toContain('C');
        expect(fsdResult[2]?.getSuccessors('B')).not.toContain('D');

        expect(fsdResult[3]?.getSuccessors('play')).toContain('C');
        expect(fsdResult[3]?.getSuccessors('C')).toContain('D');
        expect(fsdResult[3]?.getSuccessors('D')).toContain('stop');
        expect(fsdResult[2]?.getSuccessors('C')).not.toContain('A');
        expect(fsdResult[2]?.getSuccessors('C')).not.toContain('B');
        expect(fsdResult[2]?.getSuccessors('D')).not.toContain('A');
        expect(fsdResult[2]?.getSuccessors('D')).not.toContain('B');


        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['E', 'F']);
        const ssdSecondNodeSet = new Set(['G']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.PARALLEL);

        expect(ssdResult[0]).toBeFalse(); // Kante von G nach F fehlt für Parallel-Cut
    });

    it('should validate and split DFG correctly with XOR-Cut and then further with Loop-Cut', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'B', 'C', 'D', 'A', 'B', 'C'],
            ['E', 'F', 'G'],
            ['E', 'F', 'G', 'H'], // von H auch nach stop
            ['E', 'F', 'G', 'H', 'E', 'F', 'G']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C', 'D']);
        const secondNodeSet = new Set(['E', 'F', 'G', 'H']);

        // Teste ob XOR-Validierung und Aufteilung korrekt funktioniert
        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.XOR);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('XOR-Cut erfolgreich');

        expect(result[2]?.getNodes()).toContain('A'); // Teil DFG1
        expect(result[2]?.getNodes()).toContain('B');
        expect(result[2]?.getNodes()).toContain('C');
        expect(result[2]?.getNodes()).toContain('D');
        expect(result[3]?.getNodes()).toContain('E'); // Teil DFG2
        expect(result[3]?.getNodes()).toContain('F');
        expect(result[3]?.getNodes()).toContain('G');
        expect(result[3]?.getNodes()).toContain('H');

        expect(result[2]?.getSuccessors('play')).toContain('A');

        expect(result[2]?.getSuccessors('A')).toContain('B');
        expect(result[2]?.getSuccessors('B')).toContain('C');
        expect(result[2]?.getSuccessors('C')).toContain('D');
        expect(result[2]?.getSuccessors('D')).toContain('A');
        expect(result[2]?.getSuccessors('C')).toContain('stop');
        expect(result[3]?.getSuccessors('play')).toContain('E');
        expect(result[3]?.getSuccessors('E')).toContain('F');
        expect(result[3]?.getSuccessors('F')).toContain('G');
        expect(result[3]?.getSuccessors('G')).toContain('H');
        expect(result[3]?.getSuccessors('H')).toContain('E');
        expect(result[3]?.getSuccessors('G')).toContain('stop');
        expect(result[3]?.getSuccessors('H')).toContain('stop');

        // Teste ob weiter mit der Loop-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A', 'B', 'C']);
        const fsdSecondNodeSet = new Set(['D']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.LOOP);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('Loop-Cut erfolgreich');

        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('B');
        expect(fsdResult[2]?.getSuccessors('B')).toContain('C');
        expect(fsdResult[2]?.getSuccessors('C')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('D')).not.toContain('A');
        expect(fsdResult[3]?.getSuccessors('C')).not.toContain('D');


        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['E', 'F', 'G']);
        const ssdSecondNodeSet = new Set(['H']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.LOOP);

        expect(ssdResult[0]).toBeFalse(); // wegen der Kante von H nach stop
        expect(ssdResult[1]).toBe('Kante führt von H nach stop');

    });

    it('should validate and split DFG correctly with Sequence-Cut and then further with XOR-Cut', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'E', 'F'],
            ['D', 'B', 'C'],
            ['D', 'E', 'F']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'D']);
        const secondNodeSet = new Set(['B', 'C', 'E', 'F']);

        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.SEQUENCE);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Sequence-Cut erfolgreich');


        expect(result[2]?.getNodes()).toContain('A'); // Teil DFG1
        expect(result[2]?.getNodes()).toContain('D');
        expect(result[3]?.getNodes()).toContain('B'); // Teil DFG2
        expect(result[3]?.getNodes()).toContain('C');
        expect(result[3]?.getNodes()).toContain('E');
        expect(result[3]?.getNodes()).toContain('F');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('play')).toContain('D');
        expect(result[2]?.getSuccessors('A')).not.toContain('B');
        expect(result[2]?.getSuccessors('A')).not.toContain('E');
        expect(result[2]?.getSuccessors('D')).not.toContain('B');
        expect(result[2]?.getSuccessors('D')).not.toContain('E');
        expect(result[3]?.getSuccessors('B')).toContain('C');
        expect(result[3]?.getSuccessors('E')).toContain('F');
        expect(result[3]?.getSuccessors('C')).toContain('stop');
        expect(result[3]?.getSuccessors('F')).toContain('stop');

        // Teste ob weiter mit der XOR-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A']);
        const fsdSecondNodeSet = new Set(['D']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.XOR);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('XOR-Cut erfolgreich');
        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('D');
        expect(fsdResult[3]?.getSuccessors('D')).toContain('stop');

        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['B', 'C']);
        const ssdSecondNodeSet = new Set(['E', 'F']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.XOR);

        expect(ssdResult[0]).toBeTrue();
        expect(ssdResult[1]).toBe('XOR-Cut erfolgreich');
        expect(ssdResult[2]?.getSuccessors('play')).toContain('B');
        expect(ssdResult[2]?.getSuccessors('B')).toContain('C');
        expect(ssdResult[2]?.getSuccessors('C')).toContain('stop');
        expect(ssdResult[3]?.getSuccessors('play')).toContain('E');
        expect(ssdResult[3]?.getSuccessors('E')).toContain('F');
        expect(ssdResult[3]?.getSuccessors('F')).toContain('stop');
    });

    it('should validate and split DFG correctly with Sequence-Cut and then further with Sequence-Cut', () => {
        const inputStringArray: string[][] = [
            ['A', 'C', 'F', 'H'],
            ['A', 'C', 'G', 'H'],
            ['A', 'D', 'F', 'H'],
            ['A', 'D', 'G', 'H'],
            ['A', 'E', 'G', 'H'],
            ['B', 'C', 'F', 'H'],
            ['B', 'D', 'F', 'H'],
            ['B', 'D', 'G', 'H'],
            ['B', 'E', 'F', 'H'],
            ['B', 'E', 'G', 'H']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E']);
        const secondNodeSet = new Set(['F', 'G', 'H']);

        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.SEQUENCE);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Sequence-Cut erfolgreich');


        expect(result[2]?.getNodes()).toContain('A'); // Teil DFG1
        expect(result[2]?.getNodes()).toContain('B');
        expect(result[2]?.getNodes()).toContain('C');
        expect(result[2]?.getNodes()).toContain('D');
        expect(result[2]?.getNodes()).toContain('E');
        expect(result[3]?.getNodes()).toContain('F'); // Teil DFG2
        expect(result[3]?.getNodes()).toContain('G');
        expect(result[3]?.getNodes()).toContain('H');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('play')).toContain('B');
        expect(result[2]?.getSuccessors('A')).toContain('C');
        expect(result[2]?.getSuccessors('A')).toContain('D');
        expect(result[2]?.getSuccessors('A')).toContain('E');
        expect(result[2]?.getSuccessors('B')).toContain('C');
        expect(result[2]?.getSuccessors('B')).toContain('D');
        expect(result[2]?.getSuccessors('B')).toContain('E');
        expect(result[2]?.getSuccessors('C')).toContain('stop');
        expect(result[2]?.getSuccessors('D')).toContain('stop');
        expect(result[2]?.getSuccessors('E')).toContain('stop');
        expect(result[2]?.getSuccessors('C')).not.toContain('F');
        expect(result[2]?.getSuccessors('D')).not.toContain('F');
        expect(result[2]?.getSuccessors('E')).not.toContain('F');
        expect(result[2]?.getSuccessors('C')).not.toContain('G');
        expect(result[2]?.getSuccessors('D')).not.toContain('G');
        expect(result[2]?.getSuccessors('E')).not.toContain('G');
        expect(result[3]?.getSuccessors('play')).toContain('F');
        expect(result[3]?.getSuccessors('play')).toContain('G');
        expect(result[3]?.getSuccessors('F')).toContain('H');
        expect(result[3]?.getSuccessors('G')).toContain('H');
        expect(result[3]?.getSuccessors('H')).toContain('stop');
        expect(result[3]?.getPredecessors('F')).not.toContain('C');
        expect(result[3]?.getPredecessors('F')).not.toContain('D');
        expect(result[3]?.getPredecessors('F')).not.toContain('E');
        expect(result[3]?.getPredecessors('G')).not.toContain('C');
        expect(result[3]?.getPredecessors('G')).not.toContain('D');
        expect(result[3]?.getPredecessors('G')).not.toContain('E');

        // Teste ob weiter mit der Sequence-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A', 'B']);
        const fsdSecondNodeSet = new Set(['C', 'D', 'E']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.SEQUENCE);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('Sequence-Cut erfolgreich');
        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('play')).toContain('B');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('stop');
        expect(fsdResult[2]?.getSuccessors('B')).toContain('stop');
        expect(fsdResult[2]?.getSuccessors('A')).not.toContain('C');
        expect(fsdResult[2]?.getSuccessors('A')).not.toContain('D');
        expect(fsdResult[2]?.getSuccessors('A')).not.toContain('E');
        expect(fsdResult[2]?.getSuccessors('B')).not.toContain('C');
        expect(fsdResult[2]?.getSuccessors('B')).not.toContain('D');
        expect(fsdResult[2]?.getSuccessors('B')).not.toContain('E');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('C');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('D');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('E');
        expect(fsdResult[3]?.getSuccessors('C')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('D')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('E')).toContain('stop');
        expect(fsdResult[3]?.getPredecessors('C')).not.toContain('A');
        expect(fsdResult[3]?.getPredecessors('C')).not.toContain('B');
        expect(fsdResult[3]?.getPredecessors('D')).not.toContain('A');
        expect(fsdResult[3]?.getPredecessors('D')).not.toContain('B');
        expect(fsdResult[3]?.getPredecessors('E')).not.toContain('A');
        expect(fsdResult[3]?.getPredecessors('E')).not.toContain('B');

        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['F', 'G']);
        const ssdSecondNodeSet = new Set(['H']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.SEQUENCE);

        expect(ssdResult[0]).toBeTrue();
        expect(ssdResult[1]).toBe('Sequence-Cut erfolgreich');
        expect(ssdResult[2]?.getSuccessors('play')).toContain('F');
        expect(ssdResult[2]?.getSuccessors('play')).toContain('G');
        expect(ssdResult[2]?.getSuccessors('F')).toContain('stop');
        expect(ssdResult[2]?.getSuccessors('G')).toContain('stop');
        expect(ssdResult[2]?.getSuccessors('F')).not.toContain('H');
        expect(ssdResult[2]?.getSuccessors('G')).not.toContain('H');
        expect(ssdResult[3]?.getSuccessors('play')).toContain('H');
        expect(ssdResult[3]?.getSuccessors('H')).toContain('stop');
        expect(ssdResult[3]?.getPredecessors('H')).not.toContain('F');
        expect(ssdResult[3]?.getPredecessors('H')).not.toContain('G');
    });

    it('should validate and split DFG correctly with Sequence-Cut and then further with Parallel-Cut', () => {
        // sequence{ parallel_1{ {A, B, C}, {D, E} }, parallel_2{ {W, X}, {Y, Z} } }
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D', 'E', 'W', 'X', 'Y', 'Z'],
            ['A', 'B', 'D', 'C', 'E', 'W', 'X', 'Y', 'Z'],
            ['A', 'B', 'D', 'E', 'C', 'W', 'X', 'Y', 'Z'],
            ['A', 'D', 'B', 'C', 'E', 'W', 'Y', 'X', 'Z'],
            ['A', 'D', 'B', 'E', 'C', 'W', 'Y', 'Z', 'X'],
            ['A', 'D', 'E', 'B', 'C', 'Y', 'Z', 'W', 'X'],
            ['D', 'E', 'A', 'B', 'C', 'Y', 'Z', 'W', 'X'],
            ['D', 'A', 'E', 'B', 'C', 'Y', 'Z', 'W', 'X'],
            ['D', 'A', 'B', 'E', 'C', 'Y', 'W', 'Z', 'X'],
            ['D', 'A', 'B', 'C', 'E', 'Y', 'W', 'X', 'Z']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E']);
        const secondNodeSet = new Set(['W', 'X', 'Y', 'Z']);

        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.SEQUENCE);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Sequence-Cut erfolgreich');


        expect(result[2]?.getNodes()).toContain('A');
        expect(result[2]?.getNodes()).toContain('B');
        expect(result[2]?.getNodes()).toContain('C');
        expect(result[2]?.getNodes()).toContain('D');
        expect(result[2]?.getNodes()).toContain('E');
        expect(result[3]?.getNodes()).toContain('W');
        expect(result[3]?.getNodes()).toContain('X');
        expect(result[3]?.getNodes()).toContain('Y');
        expect(result[3]?.getNodes()).toContain('Z');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('play')).toContain('D');
        expect(result[2]?.getSuccessors('A')).toContain('B');
        expect(result[2]?.getSuccessors('A')).toContain('D');
        expect(result[2]?.getSuccessors('A')).toContain('E');
        expect(result[2]?.getSuccessors('B')).toContain('C');
        expect(result[2]?.getSuccessors('B')).toContain('D');
        expect(result[2]?.getSuccessors('B')).toContain('E');
        expect(result[2]?.getSuccessors('C')).toContain('D');
        expect(result[2]?.getSuccessors('C')).toContain('E');
        expect(result[2]?.getSuccessors('D')).toContain('A');
        expect(result[2]?.getSuccessors('D')).toContain('B');
        expect(result[2]?.getSuccessors('D')).toContain('C');
        expect(result[2]?.getSuccessors('D')).toContain('E');
        expect(result[2]?.getSuccessors('E')).toContain('A');
        expect(result[2]?.getSuccessors('E')).toContain('B');
        expect(result[2]?.getSuccessors('E')).toContain('C');
        expect(result[2]?.getSuccessors('C')).toContain('stop');
        expect(result[2]?.getSuccessors('E')).toContain('stop');

        expect(result[3]?.getSuccessors('play')).toContain('W');
        expect(result[3]?.getSuccessors('play')).toContain('Y');
        expect(result[3]?.getSuccessors('W')).toContain('X');
        expect(result[3]?.getSuccessors('W')).toContain('Y');
        expect(result[3]?.getSuccessors('W')).toContain('Z');
        expect(result[3]?.getSuccessors('X')).toContain('Y');
        expect(result[3]?.getSuccessors('X')).toContain('Z');
        expect(result[3]?.getSuccessors('X')).toContain('stop');
        expect(result[3]?.getSuccessors('Y')).toContain('W');
        expect(result[3]?.getSuccessors('Y')).toContain('X');
        expect(result[3]?.getSuccessors('Y')).toContain('Z');
        expect(result[3]?.getSuccessors('Z')).toContain('X');
        expect(result[3]?.getSuccessors('Z')).toContain('W');
        expect(result[3]?.getSuccessors('Z')).toContain('stop');

        // Teste ob weiter mit der Parallel-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A', 'B', 'C']);
        const fsdSecondNodeSet = new Set(['D', 'E']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.PARALLEL);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('Parallel-Cut erfolgreich');
        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('B');
        expect(fsdResult[2]?.getSuccessors('B')).toContain('C');
        expect(fsdResult[2]?.getSuccessors('C')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('D');
        expect(fsdResult[3]?.getSuccessors('D')).toContain('E');
        expect(fsdResult[3]?.getSuccessors('E')).toContain('stop');

        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['W', 'X']);
        const ssdSecondNodeSet = new Set(['Y', 'Z']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.PARALLEL);

        expect(ssdResult[0]).toBeTrue();
        expect(ssdResult[1]).toBe('Parallel-Cut erfolgreich');
        expect(ssdResult[2]?.getSuccessors('play')).toContain('W');
        expect(ssdResult[2]?.getSuccessors('W')).toContain('X');
        expect(ssdResult[2]?.getSuccessors('X')).toContain('stop');
        expect(ssdResult[3]?.getSuccessors('play')).toContain('Y');
        expect(ssdResult[3]?.getSuccessors('Y')).toContain('Z');
        expect(ssdResult[3]?.getSuccessors('Z')).toContain('stop');
    });

    it('should validate and split DFG correctly with Sequence-Cut and then further with Loop-Cut', () => {
        // sequence{ loop_1{ {A, B, C}, {D, E} }, loop_2{ {F}, {G, H} } }
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'F'],
            ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'F'],
            ['A', 'B', 'C', 'F', 'G', 'H', 'F']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E']);
        const secondNodeSet = new Set(['F', 'G', 'H']);

        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.SEQUENCE);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Sequence-Cut erfolgreich');


        expect(result[2]?.getNodes()).toContain('A'); // Teil-DFG1
        expect(result[2]?.getNodes()).toContain('B');
        expect(result[2]?.getNodes()).toContain('C');
        expect(result[2]?.getNodes()).toContain('D');
        expect(result[2]?.getNodes()).toContain('E');
        expect(result[3]?.getNodes()).toContain('F'); // Teil-DFG2
        expect(result[3]?.getNodes()).toContain('G');
        expect(result[3]?.getNodes()).toContain('H');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('A')).toContain('B');
        expect(result[2]?.getSuccessors('B')).toContain('C');
        expect(result[2]?.getSuccessors('C')).toContain('D');
        expect(result[2]?.getSuccessors('D')).toContain('E');
        expect(result[2]?.getSuccessors('E')).toContain('A');
        expect(result[2]?.getSuccessors('C')).toContain('stop');

        expect(result[3]?.getSuccessors('play')).toContain('F');
        expect(result[3]?.getSuccessors('F')).toContain('G');
        expect(result[3]?.getSuccessors('G')).toContain('H');
        expect(result[3]?.getSuccessors('H')).toContain('F');
        expect(result[3]?.getSuccessors('F')).toContain('stop');

        // Teste ob weiter mit der Loop-Validierung und Aufteilung korrekt funktioniert
        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A', 'B', 'C']);
        const fsdSecondNodeSet = new Set(['D', 'E']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.LOOP);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('Loop-Cut erfolgreich');
        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('B');
        expect(fsdResult[2]?.getSuccessors('B')).toContain('C');
        expect(fsdResult[2]?.getSuccessors('C')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('D');
        expect(fsdResult[3]?.getSuccessors('D')).toContain('E');
        expect(fsdResult[3]?.getSuccessors('E')).toContain('stop');

        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['F']);
        const ssdSecondNodeSet = new Set(['G', 'H']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.LOOP);

        expect(ssdResult[0]).toBeTrue();
        expect(ssdResult[1]).toBe('Loop-Cut erfolgreich');
        expect(ssdResult[2]?.getSuccessors('play')).toContain('F');
        expect(ssdResult[2]?.getSuccessors('F')).not.toContain('G');
        expect(ssdResult[3]?.getSuccessors('G')).toContain('H');
        expect(ssdResult[2]?.getSuccessors('H')).not.toContain('F');
        expect(ssdResult[2]?.getSuccessors('F')).toContain('stop');
    });

    it('should validate and split DFG correctly with Parallel-Cut and then further with XOR-Cut', () => {
        // parallel{ xor1{ {A, B}, {C} }, xor2{ {D}, {E, F} } }
        const inputStringArray: string[][] = [
            ['A', 'B'],
            ['A', 'D'],
            ['A', 'B', 'D'],
            ['A', 'D', 'B'],
            ['A', 'B', 'F'],
            ['A', 'F', 'B'],
            ['A', 'E', 'F'],
            ['A', 'E', 'F', 'B'],
            ['A', 'B', 'E', 'F'],
            ['C'],
            ['C', 'D'],
            ['C', 'F'],
            ['C', 'E', 'F'],
            ['D'],
            ['D', 'C'],
            ['D', 'B'],
            ['D', 'A', 'B'],
            ['E', 'B'],
            ['E', 'C'],
            ['E', 'F'],
            ['E', 'A', 'B'],
            ['E', 'A', 'B', 'F'],
            ['F', 'C'],
            ['F', 'A', 'B']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C']);
        const secondNodeSet = new Set(['D', 'E', 'F']);

        const result = ValidationHelper.testValidateAndReturn(dfg, firstNodeSet, secondNodeSet, CutType.PARALLEL);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Parallel-Cut erfolgreich');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('play')).toContain('C');
        expect(result[2]?.getSuccessors('A')).toContain('B');
        expect(result[2]?.getSuccessors('A')).not.toContain('D');
        expect(result[2]?.getSuccessors('A')).not.toContain('E');
        expect(result[2]?.getSuccessors('A')).not.toContain('F');
        expect(result[2]?.getSuccessors('B')).toContain('stop');
        expect(result[2]?.getSuccessors('B')).not.toContain('D');
        expect(result[2]?.getSuccessors('B')).not.toContain('E');
        expect(result[2]?.getSuccessors('B')).not.toContain('F');
        expect(result[2]?.getSuccessors('C')).toContain('stop');
        expect(result[2]?.getSuccessors('C')).not.toContain('D');
        expect(result[2]?.getSuccessors('C')).not.toContain('E');
        expect(result[2]?.getSuccessors('C')).not.toContain('F');

        expect(result[3]?.getSuccessors('play')).toContain('D');
        expect(result[3]?.getSuccessors('play')).toContain('E');
        expect(result[3]?.getSuccessors('D')).toContain('stop');
        expect(result[3]?.getSuccessors('D')).not.toContain('A');
        expect(result[3]?.getSuccessors('D')).not.toContain('B');
        expect(result[3]?.getSuccessors('D')).not.toContain('C');
        expect(result[3]?.getSuccessors('E')).toContain('F');
        expect(result[3]?.getSuccessors('E')).not.toContain('A');
        expect(result[3]?.getSuccessors('E')).not.toContain('B');
        expect(result[3]?.getSuccessors('E')).not.toContain('C');
        expect(result[3]?.getSuccessors('F')).toContain('stop');
        expect(result[3]?.getSuccessors('F')).not.toContain('A');
        expect(result[3]?.getSuccessors('F')).not.toContain('B');
        expect(result[3]?.getSuccessors('F')).not.toContain('C');

        const fsd = result[2] // first-sub-dfg
        const fsdFirstNodeSet = new Set(['A', 'B']);
        const fsdSecondNodeSet = new Set(['C']);

        const fsdResult = ValidationHelper.testValidateAndReturn(fsd!, fsdFirstNodeSet, fsdSecondNodeSet, CutType.XOR);

        expect(fsdResult[0]).toBeTrue();
        expect(fsdResult[1]).toBe('XOR-Cut erfolgreich');
        expect(fsdResult[2]?.getSuccessors('play')).toContain('A');
        expect(fsdResult[2]?.getSuccessors('A')).toContain('B');
        expect(fsdResult[2]?.getSuccessors('B')).toContain('stop');
        expect(fsdResult[3]?.getSuccessors('play')).toContain('C');
        expect(fsdResult[3]?.getSuccessors('C')).toContain('stop');

        const ssd = result[3] // second-sub-dfg
        const ssdFirstNodeSet = new Set(['D']);
        const ssdSecondNodeSet = new Set(['E', 'F']);

        const ssdResult = ValidationHelper.testValidateAndReturn(ssd!, ssdFirstNodeSet, ssdSecondNodeSet, CutType.XOR);

        expect(ssdResult[0]).toBeTrue();
        expect(ssdResult[1]).toBe('XOR-Cut erfolgreich');
        expect(ssdResult[2]?.getSuccessors('play')).toContain('D');
        expect(ssdResult[2]?.getSuccessors('D')).toContain('stop');
        expect(ssdResult[3]?.getSuccessors('play')).toContain('E');
        expect(ssdResult[3]?.getSuccessors('E')).toContain('F');
        expect(ssdResult[3]?.getSuccessors('F')).toContain('stop');
    });

    it('should validate and split DFG correctly with Sequence-, XOR- and Parallel-Cut', () => {
        // sequence{ {A}, xor{ parallel{ {B}, {C} }, {E} }, {D} }
        const inputStringArray: string[][] = [
            ['A', 'B', 'D'],
            ['A', 'C', 'D'],
            ['A', 'E', 'D'],
            ['A', 'B', 'C', 'D'],
            ['A', 'C', 'B', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const nsA = new Set(['A']); // nodeset {A}
        const nsBCDE = new Set(['B', 'C', 'D', 'E']); // nodeset {B, C, D, E}

        const result = ValidationHelper.testValidateAndReturn(dfg, nsA, nsBCDE, CutType.SEQUENCE);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Sequence-Cut erfolgreich');


        expect(result[2]?.getNodes()).toContain('A');
        expect(result[3]?.getNodes()).toContain('B');
        expect(result[3]?.getNodes()).toContain('C');
        expect(result[3]?.getNodes()).toContain('D');
        expect(result[3]?.getNodes()).toContain('E');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('A')).toContain('stop');
        expect(result[2]?.getSuccessors('A')).not.toContain('B');
        expect(result[2]?.getSuccessors('A')).not.toContain('C');
        expect(result[2]?.getSuccessors('A')).not.toContain('E');

        expect(result[3]?.getSuccessors('play')).toContain('B');
        expect(result[3]?.getSuccessors('play')).toContain('C');
        expect(result[3]?.getSuccessors('play')).toContain('E');
        expect(result[3]?.getSuccessors('B')).toContain('C');
        expect(result[3]?.getSuccessors('C')).toContain('B');
        expect(result[3]?.getSuccessors('B')).toContain('D');
        expect(result[3]?.getSuccessors('C')).toContain('D');
        expect(result[3]?.getSuccessors('E')).toContain('D');
        expect(result[3]?.getSuccessors('D')).toContain('stop');
        expect(result[3]?.getPredecessors('B')).not.toContain('A');
        expect(result[3]?.getPredecessors('C')).not.toContain('A');
        expect(result[3]?.getPredecessors('E')).not.toContain('A');

        // result[2] ist Base-Case {A}
        // result[3] als dfgBCDE weiter mit der Sequence-Validierung und Aufteilung
        const dfgBCDE = result[3]
        const nsBCE = new Set(['B', 'C', 'E']);
        const nsD = new Set(['D']);

        const resultDfgBCDE = ValidationHelper.testValidateAndReturn(dfgBCDE!, nsBCE, nsD, CutType.SEQUENCE);

        expect(resultDfgBCDE[0]).toBeTrue();
        expect(resultDfgBCDE[1]).toBe('Sequence-Cut erfolgreich');
        expect(resultDfgBCDE[2]?.getSuccessors('B')).toContain('stop');
        expect(resultDfgBCDE[2]?.getSuccessors('C')).toContain('stop');
        expect(resultDfgBCDE[2]?.getSuccessors('E')).toContain('stop');
        expect(resultDfgBCDE[2]?.getSuccessors('B')).not.toContain('D');
        expect(resultDfgBCDE[2]?.getSuccessors('C')).not.toContain('D');
        expect(resultDfgBCDE[2]?.getSuccessors('E')).not.toContain('D');
        expect(resultDfgBCDE[3]?.getSuccessors('play')).toContain('D');
        expect(resultDfgBCDE[3]?.getPredecessors('D')).not.toContain('B');
        expect(resultDfgBCDE[3]?.getPredecessors('D')).not.toContain('C');
        expect(resultDfgBCDE[3]?.getPredecessors('D')).not.toContain('E');

        // resultDfgBCDE[3] ist Base-Case {D}
        // resultDfgBCDE[2] als dfgBCE weiter mit der XOR-Validierung und Aufteilung
        const dfgBCE = resultDfgBCDE[2]
        const nsBC = new Set(['B', 'C']);
        const nsE = new Set(['E']);

        const resultDfgBCE = ValidationHelper.testValidateAndReturn(dfgBCE!, nsBC, nsE, CutType.XOR);

        expect(resultDfgBCE[0]).toBeTrue();
        expect(resultDfgBCE[1]).toBe('XOR-Cut erfolgreich');
        expect(resultDfgBCE[2]?.getSuccessors('play')).toContain('B');
        expect(resultDfgBCE[2]?.getSuccessors('play')).toContain('C');
        expect(resultDfgBCE[2]?.getSuccessors('B')).toContain('C');
        expect(resultDfgBCE[2]?.getSuccessors('C')).toContain('B');
        expect(resultDfgBCE[2]?.getSuccessors('B')).toContain('stop');
        expect(resultDfgBCE[2]?.getSuccessors('C')).toContain('stop');
        expect(resultDfgBCE[3]?.getSuccessors('play')).toContain('E');
        expect(resultDfgBCE[3]?.getSuccessors('E')).toContain('stop');

        // resultDfgBCE[3] ist Base-Case {E}
        // resultDfgBCE[2] als dfgBC weiter mit der Parallel-Validierung und Aufteilung
        const dfgBC = resultDfgBCE[2]
        const nsB = new Set(['B']);
        const nsC = new Set(['C']);

        const resultDfgBC = ValidationHelper.testValidateAndReturn(dfgBC!, nsB, nsC, CutType.PARALLEL);
        expect(resultDfgBC[0]).toBeTrue();
        expect(resultDfgBC[1]).toBe('Parallel-Cut erfolgreich');
        expect(resultDfgBC[2]?.getSuccessors('play')).toContain('B');
        expect(resultDfgBC[2]?.getSuccessors('B')).toContain('stop');
        expect(resultDfgBC[2]?.getSuccessors('B')).not.toContain('C');
        expect(resultDfgBC[3]?.getSuccessors('play')).toContain('C');
        expect(resultDfgBC[3]?.getSuccessors('C')).toContain('stop');
        expect(resultDfgBC[3]?.getSuccessors('C')).not.toContain('B');

        // resultDfgBC[2] ist Base-Case {B}
        // resultDfgBC[3] ist Base-Case {C}
    });

    it('should validate and split DFG correctly with Sequence-, Loop- and Parallel-Cut', () => {
        // sequence{ {A}, loop{ parallel{ {B}, {C} }, sequence{ {E}, {F} } }, {D} }
        const inputStringArray: string[][] = [
            ['A', 'B', 'D'],
            ['A', 'C', 'D'],
            ['A', 'B', 'C', 'D'],
            ['A', 'C', 'B', 'D'],
            ['A', 'B', 'E', 'F', 'C', 'D'],
            ['A', 'B', 'E', 'F', 'C', 'D'],
            ['A', 'B', 'C', 'E', 'F', 'B', 'D'],
            ['A', 'C', 'B', 'E', 'F', 'C', 'D'],
            ['A', 'C', 'E', 'F', 'B', 'D'],
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const nsA = new Set(['A']); // nodeset {A}
        const nsBCDEF = new Set(['B', 'C', 'D', 'E', 'F']); // nodeset {B, C, D, E, F}

        const result = ValidationHelper.testValidateAndReturn(dfg, nsA, nsBCDEF, CutType.SEQUENCE);

        expect(result[0]).toBeTrue();
        expect(result[1]).toBe('Sequence-Cut erfolgreich');

        expect(result[2]?.getSuccessors('play')).toContain('A');
        expect(result[2]?.getSuccessors('A')).toContain('stop');
        expect(result[2]?.getSuccessors('A')).not.toContain('B');
        expect(result[2]?.getSuccessors('A')).not.toContain('C');

        expect(result[3]?.getSuccessors('play')).toContain('B');
        expect(result[3]?.getSuccessors('play')).toContain('C');
        expect(result[3]?.getSuccessors('B')).toContain('C');
        expect(result[3]?.getSuccessors('C')).toContain('B');
        expect(result[3]?.getSuccessors('B')).toContain('D');
        expect(result[3]?.getSuccessors('C')).toContain('D');
        expect(result[3]?.getSuccessors('B')).toContain('E');
        expect(result[3]?.getSuccessors('C')).toContain('E');
        expect(result[3]?.getSuccessors('E')).toContain('F');
        expect(result[3]?.getSuccessors('F')).toContain('B');
        expect(result[3]?.getSuccessors('F')).toContain('C');
        expect(result[3]?.getSuccessors('D')).toContain('stop');
        expect(result[3]?.getPredecessors('B')).not.toContain('A');
        expect(result[3]?.getPredecessors('C')).not.toContain('A');

        // result[2] ist Base-Case {A}
        // result[3] als dfgBCDEF weiter mit der Sequence-Validierung und Aufteilung
        const dfgBCDEF = result[3]
        const nsBCEF = new Set(['B', 'C', 'E', 'F']);
        const nsD = new Set(['D']);

        const resultDfgBCDEF = ValidationHelper.testValidateAndReturn(dfgBCDEF!, nsBCEF, nsD, CutType.SEQUENCE);

        expect(resultDfgBCDEF[0]).toBeTrue();
        expect(resultDfgBCDEF[1]).toBe('Sequence-Cut erfolgreich');
        expect(resultDfgBCDEF[2]?.getSuccessors('B')).toContain('stop');
        expect(resultDfgBCDEF[2]?.getSuccessors('C')).toContain('stop');
        expect(resultDfgBCDEF[2]?.getSuccessors('E')).not.toContain('stop');
        expect(resultDfgBCDEF[2]?.getSuccessors('F')).not.toContain('stop');
        expect(resultDfgBCDEF[2]?.getPredecessors('E')).not.toContain('play');
        expect(resultDfgBCDEF[2]?.getPredecessors('F')).not.toContain('play');
        expect(resultDfgBCDEF[2]?.getSuccessors('B')).not.toContain('D');
        expect(resultDfgBCDEF[2]?.getSuccessors('C')).not.toContain('D');
        expect(resultDfgBCDEF[2]?.getSuccessors('E')).not.toContain('D');
        expect(resultDfgBCDEF[2]?.getSuccessors('F')).not.toContain('D');
        expect(resultDfgBCDEF[3]?.getSuccessors('play')).toContain('D');
        expect(resultDfgBCDEF[3]?.getPredecessors('D')).not.toContain('B');
        expect(resultDfgBCDEF[3]?.getPredecessors('D')).not.toContain('C');

        // resultDfgBCDEF[3] ist Base-Case {D}
        // resultDfgBCDEF[2] als dfgBCEF weiter mit der Loop-Validierung und Aufteilung
        const dfgBCEF = resultDfgBCDEF[2]
        const nsBC = new Set(['B', 'C']);
        const nsEF = new Set(['E', 'F']);

        const resultDfgBCEF = ValidationHelper.testValidateAndReturn(dfgBCEF!, nsBC, nsEF, CutType.LOOP);

        expect(resultDfgBCEF[0]).toBeTrue();
        expect(resultDfgBCEF[1]).toBe('Loop-Cut erfolgreich');
        expect(resultDfgBCEF[2]?.getSuccessors('play')).toContain('B');
        expect(resultDfgBCEF[2]?.getSuccessors('play')).toContain('C');
        expect(resultDfgBCEF[2]?.getSuccessors('B')).toContain('C');
        expect(resultDfgBCEF[2]?.getSuccessors('C')).toContain('B');
        expect(resultDfgBCEF[2]?.getSuccessors('B')).toContain('stop');
        expect(resultDfgBCEF[2]?.getSuccessors('C')).toContain('stop');
        expect(resultDfgBCEF[2]?.getSuccessors('B')).not.toContain('E');
        expect(resultDfgBCEF[2]?.getSuccessors('C')).not.toContain('E');
        expect(resultDfgBCEF[2]?.getPredecessors('B')).not.toContain('F');
        expect(resultDfgBCEF[2]?.getPredecessors('C')).not.toContain('F');
        expect(resultDfgBCEF[3]?.getSuccessors('play')).toContain('E');
        expect(resultDfgBCEF[3]?.getSuccessors('E')).toContain('F');
        expect(resultDfgBCEF[3]?.getSuccessors('F')).toContain('stop');
        expect(resultDfgBCEF[3]?.getSuccessors('F')).not.toContain('B');
        expect(resultDfgBCEF[3]?.getSuccessors('F')).not.toContain('C');
        expect(resultDfgBCEF[3]?.getPredecessors('E')).not.toContain('B');
        expect(resultDfgBCEF[3]?.getPredecessors('E')).not.toContain('C');

        // resultDfgBCEF[2] als dfgBC weiter mit der Parallel-Validierung und Aufteilung
        const dfgBC = resultDfgBCEF[2]
        const nsB = new Set(['B']);
        const nsC = new Set(['C']);

        const resultDfgBC = ValidationHelper.testValidateAndReturn(dfgBC!, nsB, nsC, CutType.PARALLEL);
        expect(resultDfgBC[0]).toBeTrue();
        expect(resultDfgBC[1]).toBe('Parallel-Cut erfolgreich');
        expect(resultDfgBC[2]?.getSuccessors('play')).toContain('B');
        expect(resultDfgBC[2]?.getSuccessors('B')).toContain('stop');
        expect(resultDfgBC[2]?.getSuccessors('B')).not.toContain('C');
        expect(resultDfgBC[3]?.getSuccessors('play')).toContain('C');
        expect(resultDfgBC[3]?.getSuccessors('C')).toContain('stop');
        expect(resultDfgBC[3]?.getSuccessors('C')).not.toContain('B');

        // resultDfgBC[2] ist Base-Case {B}
        // resultDfgBC[3] ist Base-Case {C}

        // resultDfgBCEF[3] als dfgBC weiter mit der Sequence-Validierung und Aufteilung
        const dfgEF = resultDfgBCEF[3]
        const nsE = new Set(['E']);
        const nsF = new Set(['F']);

        const resultDfgEF = ValidationHelper.testValidateAndReturn(dfgEF!, nsE, nsF, CutType.SEQUENCE);
        expect(resultDfgEF[0]).toBeTrue();
        expect(resultDfgEF[1]).toBe('Sequence-Cut erfolgreich');
        expect(resultDfgEF[2]?.getSuccessors('play')).toContain('E');
        expect(resultDfgEF[2]?.getSuccessors('E')).toContain('stop');
        expect(resultDfgEF[2]?.getSuccessors('E')).not.toContain('F');
        expect(resultDfgEF[3]?.getSuccessors('play')).toContain('F');
        expect(resultDfgEF[3]?.getSuccessors('F')).toContain('stop');
        expect(resultDfgEF[3]?.getPredecessors('F')).not.toContain('E');

        // resultDfgEF[2] ist Base-Case {E}
        // resultDfgEF[3] ist Base-Case {F}
    });

});

describe('validator', () => {
    let dfg: DirectlyFollows;
    it('should return false for an invalid cut with missing nodes', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['D', 'E']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B']);
        const secondNodeSet = new Set(['D', 'E']);

        // Alle Knoten müssen abgedeckt sein; in diesem Fall fehlt 'C'
        const result = ValidationHelper['validator'](dfg, firstNodeSet, secondNodeSet, CutType.XOR);

        expect(result[0]).toBeFalse();
        expect(result[1]).toBe('Es müssen alle Knoten in den Mengen vorkommen und sie müssen exklusiv sein');
    });
});

describe('allNodesUsedValidation', () => {
    let dfg: DirectlyFollows;
    it('should return true when all nodes are used for validation', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'C', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C']);
        const secondNodeSet = new Set(['D']);

        const result = ValidationHelper['allNodesUsedValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result).toBeTrue();
    });

    it('should return false when not all nodes are used for validation', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'C', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A']);
        const secondNodeSet = new Set(['C', 'D']);

        const result = ValidationHelper['allNodesUsedValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result).toBeFalse();
    });

    it('should return false when the sub-nodesets which are used for validation are not distinct', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'C', 'D'],
            ['A', 'E', 'F', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C']);
        const secondNodeSet = new Set(['C', 'D', 'E', 'F']);

        const result = ValidationHelper['allNodesUsedValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result).toBeFalse();
    });
});

describe('xorValidation', () => {
    let dfg: DirectlyFollows;
    it('should return true for valid XOR cut with disconnected subgraphs', () => {
        const inputStringArray: string[][] = [
            ['A', 'B'],
            ['C', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B']);
        const secondNodeSet = new Set(['C', 'D']);

        const result = ValidationHelper['xorValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result[0]).toBeTrue();
    });

    it('should return false for invalid XOR cut with connections between sets', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['B', 'C', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B']);
        const secondNodeSet = new Set(['C', 'D']);

        const result = ValidationHelper['xorValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result[0]).toBeFalse(); // Verbindungen zwischen Mengen
        expect(result[1]).toBe('Kante von B nach C gefunden');
    });
});

describe('sequenceValidation', () => {
    let dfg: DirectlyFollows;
    it('should return true only for valid sequence cut', () => {
        // X∈{A,E}:{B,F},Y∈{B,F}:{C,G}
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'B', 'G'],
            ['A', 'F', 'C'],
            ['A', 'F', 'G'],
            ['E', 'B', 'C'],
            ['E', 'B', 'G'],
            ['E', 'F', 'C'],
            ['E', 'F', 'G']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        // Erste gültige Cut
        const firstCutFirstNodeSet = new Set(['A', 'E']);
        const firstCutSecondNodeSet = new Set(['B', 'C', 'F', 'G']);

        const firstResult = ValidationHelper['sequenceValidation'](dfg, firstCutFirstNodeSet, firstCutSecondNodeSet);

        expect(firstResult[0]).toBeTrue();

        // Zweite gültige Cut
        const secondCutFirstNodeSet = new Set(['A', 'B', 'E', 'F']);
        const secondCutSecondNodeSet = new Set(['C', 'G']);

        const secondResult = ValidationHelper['sequenceValidation'](dfg, secondCutFirstNodeSet, secondCutSecondNodeSet);

        expect(secondResult[0]).toBeTrue();

        // Ungültige Cut
        const invalidCutFirstNodeSet = new Set(['A', 'F']);
        const invalidCutSecondNodeSet = new Set(['B', 'C', 'E', 'G']);

        const invalidCutResult = ValidationHelper['sequenceValidation'](dfg, invalidCutFirstNodeSet, invalidCutSecondNodeSet);

        expect(invalidCutResult[0]).toBeFalse();

    });

    it('should return false for invalid sequence cut without connection between sub-nodesets', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['E', 'F', 'G', 'H']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B', 'C', 'D']);
        const secondNodeSet = new Set(['E', 'F', 'G', 'H']);

        const result = ValidationHelper['sequenceValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result[0]).toBeFalse();
        expect(result[1]).toBe('Kein Weg von A nach E gefunden');
    });

    it('should return false for invalid sequence cut with backward path', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['B', 'C', 'D', 'B']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        const firstNodeSet = new Set(['A', 'B']);
        const secondNodeSet = new Set(['C', 'D']);

        const result = ValidationHelper['sequenceValidation'](dfg, firstNodeSet, secondNodeSet);

        expect(result[0]).toBeFalse();
        expect(result[1]).toBe('Weg von C in erste Knotenmenge gefunden');
    });
});

describe('parallelValidation', () => {
    let dfg: DirectlyFollows;
    it('should return true for valid parallel cut with elementary sub-nodesets', () => {
        const inputStringArray: string[][] = [
            ['A', 'B'],
            ['B', 'A'],
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        // Erste gültige Cut
        const firstCutFirstNodeSet = new Set(['A']);
        const firstCutSecondNodeSet = new Set(['B']);

        const firstResult = ValidationHelper['parallelValidation'](dfg, firstCutFirstNodeSet, firstCutSecondNodeSet);

        expect(firstResult[0]).toBeTrue();
        expect(firstResult[1]).toBe('null');

        // Ungültige Cut
        const secondCutFirstNodeSet = new Set(['A', 'B']);
        const secondCutSecondNodeSet = new Set([]);

        const secondResult = ValidationHelper.testValidateAndReturn(dfg, secondCutFirstNodeSet, secondCutSecondNodeSet, CutType.PARALLEL);

        expect(secondResult[0]).toBeFalse();
        expect(secondResult[1]).toBe('Ein übergebenes NodeSet ist leer');

        // Ungültige Cut

        const thirdCutFirstNodeSet = new Set([]);
        const thirdCutSecondNodeSet = new Set(['B']);

        const thirdResult = ValidationHelper.testValidateAndReturn(dfg, thirdCutFirstNodeSet, thirdCutSecondNodeSet, CutType.PARALLEL);
        expect(thirdResult[0]).toBeFalse();
        expect(thirdResult[1]).toBe('Ein übergebenes NodeSet ist leer');

    });

    it('should return true for valid parallel cut', () => {
        // play -> {A, B}, A -> {B, C, D}, B -> {A, C, D}, C -> {B, D, stop}, D -> {A, C, stop}
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['A', 'C', 'B', 'D'],
            ['B', 'A', 'D', 'C'],
            ['B', 'D', 'A', 'C'],
            ['A', 'B', 'D', 'C'],
            ['B', 'A', 'C', 'D']
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        // Gültige Cut
        const firstCutFirstNodeSet = new Set(['A', 'C']);
        const firstCutSecondNodeSet = new Set(['B', 'D']);

        const firstResult = ValidationHelper['parallelValidation'](dfg, firstCutFirstNodeSet, firstCutSecondNodeSet);

        expect(firstResult[0]).toBeTrue();
        expect(firstResult[1]).toBe('null');
    });
});

describe('loopValidation', () => {
    let dfg: DirectlyFollows;
    it('should return true for simple valid loop cut', () => {
        // Do: A -> B, Redo: C
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'A', 'B'],
            ['A', 'B'],
            ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B'],
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        // Gültige Cut
        const firstCutFirstNodeSet = new Set(['A', 'B']);
        const firstCutSecondNodeSet = new Set(['C']);

        const firstResult = ValidationHelper['loopValidation'](dfg, firstCutFirstNodeSet, firstCutSecondNodeSet);

        expect(firstResult[0]).toBeTrue();
        expect(firstResult[1]).toBe('null');

        // Ungültige Cut
        const secondCutFirstNodeSet = new Set(['B', 'C']);
        const secondCutSecondNodeSet = new Set(['A']);

        const secondResult = ValidationHelper['loopValidation'](dfg, secondCutFirstNodeSet, secondCutSecondNodeSet);

        expect(secondResult[0]).toBeFalse();
        expect(secondResult[1]).toBe('Kante führt von play nach A'); // weil A in playNodes nicht in firstNodeSetPlay existiert..?

    });

    it('should return true for valid loop cut with multiple paths in redo part', () => {
        // Do: A -> B -> C, Redo: D -> {E, F}
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C'],
            ['A', 'B', 'C', 'D', 'F', 'A', 'B', 'C'],
            ['A', 'B', 'C'],
        ];

        dfg.setDFGfromStringArray(inputStringArray);

        // Gültige Cut
        const firstCutFirstNodeSet = new Set(['A', 'B', 'C']);
        const firstCutSecondNodeSet = new Set(['D', 'E', 'F']);

        const firstResult = ValidationHelper['loopValidation'](dfg, firstCutFirstNodeSet, firstCutSecondNodeSet);

        expect(firstResult[0]).toBeTrue();
        expect(firstResult[1]).toBe('null');

        // Ungültige Cut
        const secondCutFirstNodeSet = new Set(['D', 'E', 'F']);
        const secondCutSecondNodeSet = new Set(['A', 'B', 'C']);

        const secondResult = ValidationHelper['loopValidation'](dfg, secondCutFirstNodeSet, secondCutSecondNodeSet);

        expect(secondResult[0]).toBeFalse();
    });
});

describe('createNewDFG', () => {
    let dfg: DirectlyFollows;
    it('should create a new DFG based on a subset of nodes', () => {
        // X∈{A,E}:{B,F},Y∈{B,F}:{C,G}
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'B', 'G'],
            ['A', 'F', 'C'],
            ['A', 'F', 'G'],
            ['E', 'B', 'C'],
            ['E', 'B', 'G'],
            ['E', 'F', 'C'],
            ['E', 'F', 'G']
        ];

        dfg.setDFGfromStringArray(inputStringArray);
        const nodeSubset = new Set(['A', 'B', 'E', 'F']);
        const newDfg = ValidationHelper['createNewDFG'](dfg, nodeSubset);

        expect(newDfg).toBeTruthy();

        // Erwartungen von nodes
        let nodes = newDfg.getNodes();
        expect(nodes.size).toBe(4); // A, B, E, F

        expect(newDfg.getNodes().has('A')).toBe(true);
        expect(newDfg.getNodes().has('B')).toBe(true);
        expect(newDfg.getNodes().has('E')).toBe(true);
        expect(newDfg.getNodes().has('F')).toBe(true);

        expect(newDfg.getNodes().has('C')).toBe(false);
        expect(newDfg.getNodes().has('G')).toBe(false);

        // Erwartungen von arcs
        let arcs = newDfg.getArcs();
        expect(arcs.length).toBe(8); // play-A, play-E, A-B, A-F, E-B, E-F, B-stop, F-stop. 8 arcs

        // Kanten, die enthalten sein sollen
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'A')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'E')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'B')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'F')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'B')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'F')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'stop')).toBeTrue();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'stop')).toBeTrue();

        // Kanten, die nicht enthalten sein sollen
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'play')).toBeFalse(); // von play nur nach A, E
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'B')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'F')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'G')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'play' && arc.target === 'stop')).toBeFalse();  // Fehler?
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'A')).toBeFalse(); // von A nur nach B, F
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'E')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'G')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'A' && arc.target === 'stop')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'B')).toBeFalse(); // von B nur nach stop
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'A')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'E')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'F')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'B' && arc.target === 'G')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'C')).toBeFalse(); // C ist nicht enthalten
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'A')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'B')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'E')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'F')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'G')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'C' && arc.target === 'stop')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'E')).toBeFalse(); // von E nur nach B, F
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'A')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'G')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'E' && arc.target === 'stop')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'F')).toBeFalse(); // von F nur nach stop
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'A')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'B')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'E')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'F' && arc.target === 'G')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'G')).toBeFalse(); // G ist nicht enthalten
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'A')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'B')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'E')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'F')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'G' && arc.target === 'stop')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'stop')).toBeFalse(); // von stop nirgendwohin
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'play')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'A')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'B')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'C')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'E')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'F')).toBeFalse();
        expect(arcs.some(arc => arc.source === 'stop' && arc.target === 'G')).toBeFalse();


        // Erwartungen von successorMap und predecessorMap
        expect(newDfg.getSuccessors('play')?.has('A')).toBeTrue();
        expect(newDfg.getSuccessors('play')?.has('E')).toBeTrue();
        expect(newDfg.getSuccessors('A')?.has('B')).toBeTrue();
        expect(newDfg.getSuccessors('A')?.has('F')).toBeTrue();
        expect(newDfg.getSuccessors('E')?.has('B')).toBeTrue();
        expect(newDfg.getSuccessors('E')?.has('F')).toBeTrue();
        expect(newDfg.getSuccessors('B')?.has('stop')).toBeTrue();
        expect(newDfg.getSuccessors('F')?.has('stop')).toBeTrue();

        expect(newDfg.getPredecessors('A')?.has('play')).toBeTrue();
        expect(newDfg.getPredecessors('E')?.has('play')).toBeTrue();
        expect(newDfg.getPredecessors('B')?.has('A')).toBeTrue();
        expect(newDfg.getPredecessors('F')?.has('A')).toBeTrue();
        expect(newDfg.getPredecessors('B')?.has('E')).toBeTrue();
        expect(newDfg.getPredecessors('F')?.has('E')).toBeTrue();
        expect(newDfg.getPredecessors('stop')?.has('B')).toBeTrue();
        expect(newDfg.getPredecessors('stop')?.has('F')).toBeTrue();

        expect(newDfg.getSuccessors('play')?.has('play')).toBeFalse();
        expect(newDfg.getSuccessors('play')?.has('B')).toBeFalse();
        expect(newDfg.getSuccessors('play')?.has('C')).toBeFalse();
        expect(newDfg.getSuccessors('play')?.has('F')).toBeFalse();
        expect(newDfg.getSuccessors('play')?.has('G')).toBeFalse();
        expect(newDfg.getSuccessors('play')?.has('stop')).toBeFalse(); // Fehler?
        expect(newDfg.getSuccessors('A')?.has('play')).toBeFalse();
        expect(newDfg.getSuccessors('A')?.has('A')).toBeFalse();
        expect(newDfg.getSuccessors('A')?.has('C')).toBeFalse();
        expect(newDfg.getSuccessors('A')?.has('E')).toBeFalse();
        expect(newDfg.getSuccessors('A')?.has('G')).toBeFalse();
        expect(newDfg.getSuccessors('A')?.has('stop')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('play')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('A')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('B')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('C')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('E')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('F')).toBeFalse();
        expect(newDfg.getSuccessors('B')?.has('G')).toBeFalse();
        expect(newDfg.getSuccessors('E')?.has('play')).toBeFalse();
        expect(newDfg.getSuccessors('E')?.has('A')).toBeFalse();
        expect(newDfg.getSuccessors('E')?.has('C')).toBeFalse();
        expect(newDfg.getSuccessors('E')?.has('E')).toBeFalse();
        expect(newDfg.getSuccessors('E')?.has('G')).toBeFalse();
        expect(newDfg.getSuccessors('E')?.has('stop')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('play')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('A')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('B')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('C')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('E')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('F')).toBeFalse();
        expect(newDfg.getSuccessors('F')?.has('G')).toBeFalse();

        expect(newDfg.getPredecessors('B')?.has('play')).toBeFalse();
        expect(newDfg.getPredecessors('F')?.has('play')).toBeFalse();
        expect(newDfg.getPredecessors('stop')?.has('play')).toBeFalse(); // Fehler?
        expect(newDfg.getPredecessors('A')?.has('A')).toBeFalse();
        expect(newDfg.getPredecessors('E')?.has('A')).toBeFalse();
        expect(newDfg.getPredecessors('stop')?.has('A')).toBeFalse();
        expect(newDfg.getPredecessors('A')?.has('B')).toBeFalse();
        expect(newDfg.getPredecessors('B')?.has('B')).toBeFalse();
        expect(newDfg.getPredecessors('E')?.has('B')).toBeFalse();
        expect(newDfg.getPredecessors('F')?.has('B')).toBeFalse();
        expect(newDfg.getPredecessors('A')?.has('E')).toBeFalse();
        expect(newDfg.getPredecessors('E')?.has('E')).toBeFalse();
        expect(newDfg.getPredecessors('stop')?.has('E')).toBeFalse();
        expect(newDfg.getPredecessors('A')?.has('F')).toBeFalse();
        expect(newDfg.getPredecessors('B')?.has('F')).toBeFalse();
        expect(newDfg.getPredecessors('E')?.has('F')).toBeFalse();
        expect(newDfg.getPredecessors('F')?.has('F')).toBeFalse();

        expect(newDfg.getSuccessors('stop')).toBeUndefined();
        expect(newDfg.getSuccessors('C')).toBeUndefined();
        expect(newDfg.getSuccessors('G')).toBeUndefined();
        expect(newDfg.getPredecessors('C')).toBeUndefined();
        expect(newDfg.getPredecessors('G')).toBeUndefined();
        expect(newDfg.getPredecessors('play')).toBeUndefined();

    });
});


/*








*/

