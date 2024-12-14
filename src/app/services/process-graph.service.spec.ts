import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {ProcessGraphService} from './process-graph.service';
import {DirectlyFollows} from '../classes/directly-follows';
import {CutType} from '../classes/cut-type.enum';
import {effect, runInInjectionContext, Injector} from '@angular/core';
import {ProcessGraph} from "../classes/process-graph";
import {ValidationData} from "../classes/validation-data";
import {ValidationResult} from "../classes/validation-result";


describe('ProcessGraphService Signal Reaktivität', () => {
    let service: ProcessGraphService;
    let injector: Injector;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ProcessGraphService],
        });
        service = TestBed.inject(ProcessGraphService);
        injector = TestBed.inject(Injector);
    });

    it('should trigger effect when validationSuccessful changes', fakeAsync(() => {
        service.createGraph([['A', 'B']]);
        let observedValue: boolean | null = false;
        // Verwende runInInjectionContext mit Injector und der Funktion für den Effekt
        runInInjectionContext(injector, () => {
            effect(() => {
                observedValue = service.graphSignal()?.validationSuccessful ?? null;
            });
        });
        expect(service.graphSignal()?.validationSuccessful).toBeFalse();
        expect(observedValue).toBeFalse();
        // Ändere den Wert des Signals
        service.updateValidationSuccessful(true);
        tick(); // Simuliere die asynchrone Ausführung des reaktiven Systems
        expect(observedValue).toBeTrue();
        service.updateValidationSuccessful(false);
        tick(); // Simuliere die asynchrone Ausführung des reaktiven Systems
        expect(observedValue).toBeFalse();
        service.updateValidationSuccessful(true);
        tick(); // Simuliere die asynchrone Ausführung des reaktiven Systems
        expect(observedValue).toBeTrue();
        service.updateValidationSuccessful(false);
        tick(); // Simuliere die asynchrone Ausführung des reaktiven Systems
        expect(observedValue).toBeFalse();
    }));
});

describe('CutValidation on progress graph', () => {
    let dfg: DirectlyFollows;
    let processGraphService: ProcessGraphService;

    beforeEach(() => {
        processGraphService = new ProcessGraphService();
        dfg = new DirectlyFollows();
    });
    describe('Inititate Processgraph', () => {
        beforeEach(() => {
            const inputStringArray: string[][] = [
                ['A', 'B'],
                ['C', 'D', 'E', 'F', 'G'],
                ['C', 'D', 'E', 'F', 'G'],
                ['C', 'D', 'E', 'F', 'G'],
                ['C', 'D', 'E', 'U', 'D', 'E', 'F', 'G'],
            ];
            processGraphService.createGraph(inputStringArray);
        });
        it('should pull the correct dfg from process-graph', () => {
            // Subscribe to the signal (observable) to capture emitted values
            let graph = processGraphService.graphSignal()
            let dfgArray = Array.from(graph?.dfgSet || []);
            dfg = dfgArray[0];
            expect(graph?.dfgSet.has(dfg)).toBe(true)
            expect(graph?.dfgSet.size).toBe(1);
            expect(graph?.arcs.length).toBe(6);
        });
        describe('xor cut in ProgressGraph', () => {
            let graph: ProcessGraph | null
            let dfgArray: DirectlyFollows[]
            let valiDat: ValidationData
            let result: ValidationResult
            beforeEach(() => {
                graph = processGraphService.graphSignal();
                dfgArray = Array.from(graph?.dfgSet || []);
                dfg = dfgArray[0];
                valiDat = {
                    dfg: dfg,
                    firstNodeSet: new Set<string>(['A', 'B']),
                    cutType: CutType.XOR,
                }
                result = processGraphService.validateCut(valiDat)
            })
            it('make a correct xor cut and have 2 dfg on petrinet', () => {
                graph = processGraphService.graphSignal();
                expect(graph?.dfgSet.size === 2).toBe(true);
                expect(result.validationSuccessful).toBe(true);
                expect(graph?.arcs.length).toBe(8);
                expect(graph?.places.size).toBe(4);
            });
        });

        //TODO: nächstes seqence cut, dann loop cut.. immer kantenmengen und anzahl der elemente abtesten..
        // die darauffolgenden dfgs muss man mit Logik (schau ob knoten in dfg, dann nimm ihn) aus dem dfgSet ziehen..
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
            const result = processGraphService.validateCut(valiDat)
            expect(result.validationSuccessful).toBeTrue();
            expect(result.comment).toBe('XOR-Cut successful');
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
});
describe('ProcessGraphService', () => {
    let dfg: DirectlyFollows;
    let processGraphService: ProcessGraphService;
    beforeEach(() => {
        processGraphService = new ProcessGraphService();
        dfg = new DirectlyFollows();
        processGraphService = new ProcessGraphService();
        const inputStringArray: string[][] = [
            ['A', 'B'],
            ['C', 'D', 'E', 'F', 'G'],
            ['C', 'D', 'E', 'F', 'G'],
            ['C', 'D', 'E', 'F', 'G'],
            ['C', 'D', 'E', 'U', 'D', 'E', 'F', 'G'],
        ];
        processGraphService.createGraph(inputStringArray);
    });

    it('should be created', () => {
        expect(processGraphService).toBeTruthy();
    });

    describe('createGraph', () => {
        it('should create a graph and update the signal', () => {
            const eventLog = [['A', 'B'], ['B', 'C']];
            processGraphService.createGraph(eventLog);

            let graph = processGraphService.graphSignal();
            expect(graph).toBeTruthy();
            expect(graph?.places.size).toBeGreaterThan(0);
            expect(graph?.transitions.size).toBeGreaterThan(0);
        });
    });

    describe('updateValidationSuccessful', () => {
        it('should update the validationSuccessful flag', () => {
            processGraphService.createGraph([['A', 'B']]);
            expect(processGraphService.graphSignal()?.validationSuccessful).toBeFalse();
            processGraphService.updateValidationSuccessful(true);
            expect(processGraphService.graphSignal()?.validationSuccessful).toBeTrue();
        });
    });

    describe('generateUniqueId', () => {
        it('should generate unique IDs', () => {
            const id1 = processGraphService.generateUniqueId('test');
            const id2 = processGraphService.generateUniqueId('test');
            expect(id1).not.toEqual(id2);
            expect(id1).toContain('test_');
        });
    });

});
