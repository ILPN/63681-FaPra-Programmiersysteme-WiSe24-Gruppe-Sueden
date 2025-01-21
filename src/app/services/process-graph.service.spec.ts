import {ProcessGraphService} from './process-graph.service';
import {DirectlyFollows} from '../classes/directly-follows';
import {CutType} from '../classes/cut-type.enum';
import {ProcessGraph} from "../classes/process-graph";
import {ValidationData} from "../classes/validation-data";
import {ValidationResult} from "../classes/validation-result";
import {DfgNode} from "../classes/graph/dfg-node";



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
            dfg = dfgArray[0].dfg;
            expect(graph?.dfgSet.has(dfgArray[0])).toBe(true)
            expect(graph?.dfgSet.size).toBe(1);
            expect(graph?.arcs.length).toBe(6);
        });
        describe('xor cut in ProgressGraph', () => {
            let graph: ProcessGraph | null
            let dfgArray: DfgNode[]
            let valiDat: ValidationData
            let result: ValidationResult
            beforeEach(() => {
                graph = processGraphService.graphSignal();
                dfgArray = Array.from(graph?.dfgSet || []);
                dfg = dfgArray[0].dfg;
                valiDat = {
                    dfg: dfgArray[0],
                    firstNodeSet: new Set<string>(['A', 'B']),
                    cutType: CutType.XOR,
                }
                result = processGraphService.validateCut(valiDat)
            })
            it('make a correct xor cut and have 2 dfg on petrinet', () => {
                graph = processGraphService.graphSignal();
                expect(graph?.dfgSet.size === 2).toBe(true);
                expect(result.success).toBe(true);
                expect(graph?.arcs.length).toBe(8);
                expect(graph?.places.size).toBe(4);
                let log = processGraphService.logSignal()
                expect(log.includes('Initial Graph generated')).toBe(true);
                expect(log.includes('Start validation for cutType: xor')).toBe(true);
                expect(log.includes('checking if NodeSets are empty')).toBe(true);
                expect(log.includes('checking if there are no arcs from NodeSet 2 to NodeSet 1')).toBe(true);
                expect(log.includes('Xor-Cut successfully executed')).toBe(true);
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
            dfg = dfgArray[0].dfg;

            let firstNodeSet = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
            let secondNodeSet = new Set(['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']);
            const valiDat: ValidationData = {
                dfg: dfgArray[0],
                firstNodeSet: firstNodeSet,
                cutType: CutType.XOR,
            }

            // Teste die erste XOR-Aufteilung
            const result = processGraphService.validateCut(valiDat)
            expect(result.success).toBeTrue();
            expect(result.comment).toBe('XOR-Cut successful');
            for (let dfg of graph?.dfgSet || []) {
                if (dfg.dfg.getNodes().has('A')) {
                    for (let node of dfg.dfg.getNodes()) {
                        expect(firstNodeSet.has(node)).toBe(true);
                        firstNodeSet.delete(node);
                    }
                } else {
                    for (let node of dfg.dfg.getNodes()) {
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

    describe('generateUniqueId', () => {
        it('should generate unique IDs', () => {
            const id1 = processGraphService.generateUniqueId('test');
            const id2 = processGraphService.generateUniqueId('test');
            expect(id1).not.toEqual(id2);
            expect(id1).toContain('test_');
        });
    });

});
