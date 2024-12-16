import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {FallthroughHelper} from '../helper/FallthroughHelper';
import {DirectlyFollows} from '../classes/directly-follows';

describe('FallthroughHelper Test', () => {
    let dfg: DirectlyFollows;

    beforeEach(() => {
    });

    describe('computeReachabilityMatrix', () => {
        it('should return correct reachability matrix', fakeAsync(() => {
            const inputStringArray = [
                ['A', 'B', 'C'],
                ['A', 'B', 'C', 'A', 'B', 'C']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)

            const result = FallthroughHelper.computeReachabilityMatrix(dfg);
            const expectedResult = [[true, true, true], [true, true, true], [true, true, true]];
            expect(result).toEqual(expectedResult);

        }));
    });

    describe('mergeComponents', () => {
        it('should return correctly merged component', fakeAsync(() => {
            const components = [['A'], ['B'], ['C'], ['D']];
            const c1 = components[0];
            const c2 = components[2];

            const result1 = FallthroughHelper.mergeComponents(components, c1, c2);
            expect(result1[0][0]).toBe('B'); // result1 = [['B'], ['D'], ['A', 'C']]
            expect(result1[1][0]).toBe('D');
            expect(result1[2][0]).toBe('A');
            expect(result1[2][1]).toBe('C');

            const c3 = result1[0];
            const c4 = result1[1];
            const result2 = FallthroughHelper.mergeComponents(result1, c3, c4);
            expect(result2[0][0]).toBe('A'); // result2 = [['A', 'C'], ['B', 'D']]
            expect(result2[0][1]).toBe('C');
            expect(result2[1][0]).toBe('B');
            expect(result2[1][1]).toBe('D');

        }));
    });


    describe('isSequenceCutPossible', () => {

        it('should return true when sequence cut is possible 1', fakeAsync(() => {
            const nodes = ['A', 'B', 'C'];
            const reachabilityMatrix: boolean[][] = [
                [false, true, true],
                [false, false, true],
                [false, false, false]
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(true);


        }));

        it('should return true when sequence cut is possible 2', fakeAsync(() => {
            const nodes = ['A', 'B', 'C', 'D', 'E', 'F'];
            const reachabilityMatrix: boolean[][] = [
                [false, true, true, true, true, true],
                [false, true, true, true, false, false],
                [false, true, true, true, false, false],
                [false, true, true, true, false, false],
                [false, false, false, false, false, true],
                [false, false, false, false, false, false]
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(true);

        }));

        it('should return true when sequence cut is possible 3', fakeAsync(() => {
            const nodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const reachabilityMatrix: boolean[][] = [
                [false, true, true, true, true, true, true, true],
                [false, false, true, true, true, true, true, true],
                [false, true, false, true, true, true, true, true],
                [false, false, false, false, true, true, true, true],
                [false, false, false, false, false, false, true, false],
                [false, false, false, false, false, false, true, true],
                [false, false, false, false, false, false, false, false],
                [false, false, false, false, false, false, false, false]
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(true);

        }));

        it('should return true when sequence cut is possible 4', fakeAsync(() => {
            const nodes = ['A', 'B', 'C'];
            const reachabilityMatrix: boolean[][] = [ // a to c reachable directly and also via b, sequence cut includes skip
                [false, true, true],
                [false, false, true],
                [false, false, false]
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(true);

        }));

        it('should return false when sequence cut is not possible 1', fakeAsync(() => {
            const nodes = ['A', 'B', 'C', 'D'];
            const reachabilityMatrix: boolean[][] = [ // 1 SCC, nodes are all reachable from each other
                [false, true, true, true], // A can reach all others
                [true, false, true, true], // B can reach all others
                [true, true, false, true], // C can reach all others
                [true, true, true, false]  // D can reach all others
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(false); // No cut is possible as all nodes are connected

        }));

        it('should return false when sequence cut is not possible 2', fakeAsync(() => {
            const nodes = ['A', 'B', 'C', 'D'];
            const reachabilityMatrix: boolean[][] = [ // 2 WCCs, isolated from each other
                [false, true, false, false], // A can reach B
                [false, false, false, false], // B can't reach all others
                [false, false, false, true], // C can reach D
                [false, false, false, false]  // D can't reach all others
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(false); // No cut is possible as all nodes are connected

        }));

        it('should return false when sequence cut is not possible 3', fakeAsync(() => {
            const nodes = ['A', 'B', 'C', 'D'];
            const reachabilityMatrix: boolean[][] = [ // all nodes are isolated
                [false, false, false, false],
                [false, false, false, false],
                [false, false, false, false],
                [false, false, false, false]
            ];

            const result = FallthroughHelper.isSequenceCutPossible(nodes, reachabilityMatrix);
            expect(result).toBe(false);

        }));

    });

    describe('isParallelCutPossible', () => {

        it('should return true when parallel cut is possible 1', fakeAsync(() => {
            const inputStringArray = [
                ['A', 'B'],
                ['B', 'A']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(true);
        }));

        it('should return true when parallel cut is possible 2', fakeAsync(() => {
            const inputStringArray = [
                ['A', 'B', 'C'],
                ['A', 'C', 'B'],
                ['C', 'A', 'B']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(true);
        }));

        it('should return true when parallel cut is possible 3', fakeAsync(() => {
            const inputStringArray = [
                ['A', 'B', 'C', 'D'],
                ['A', 'C', 'B', 'D'],
                ['A', 'C', 'D', 'B'],
                ['C', 'A', 'B', 'D'],
                ['C', 'A', 'D', 'B'],
                ['C', 'D', 'A', 'B']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(true);
        }));

        it('should return false when parallel cut is not possible 1', fakeAsync(() => {
            const inputStringArray = [
                ['A'],
                ['A', 'B']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(false);
        }));

        it('should return false when parallel cut is not possible 2', fakeAsync(() => {
            const inputStringArray = [ // has loop-cut structure
                ['A', 'B', 'C'],
                ['A', 'B', 'C', 'D', 'A', 'B', 'C']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(false);
        }));

        it('should return false when parallel cut is not possible 3', fakeAsync(() => {
            const inputStringArray = [ // arc (C -> A) missing for parallel-cut
                ['A', 'B', 'C'],
                ['A', 'C', 'B'],
                ['C']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(false);
        }));

        it('should return false when parallel cut is not possible 4', fakeAsync(() => {
            const inputStringArray = [ // arc (C -> D), (D -> A), (B -> C) missing
                ['A', 'B'],
                ['A', 'C', 'B', 'D'],
                ['A', 'C', 'B'],
                ['C', 'A', 'B', 'D'],
                ['C', 'A', 'D', 'B']
            ];

            let dfg = new DirectlyFollows();
            dfg.setDFGfromStringArray(inputStringArray)
            const nodesAsArray = Array.from(dfg.getNodes()).sort();
            const footprintMatrix = FallthroughHelper.computeFootprintMatrix(dfg);
            const inverseFootprintMatrix = FallthroughHelper.invertFootprintMatrix(footprintMatrix);

            const result = FallthroughHelper.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix);
            expect(result).toEqual(false);
        }));

    });

    /*

        describe('isLoopCutPossible', () => {

            it('should return true when loop cut is possible 1', fakeAsync(() => {
                const inputStringArray = [
                    ['A', 'B', 'C'],
                    ['A', 'B', 'C', 'A', 'B', 'C']
                ];

                let dfg = new DirectlyFollows();
                dfg.setDFGfromStringArray(inputStringArray)

                const result = FallthroughHelper.isLoopCutPossible(dfg);
                expect(result).toBe(true);
            }));

            it('should return true when loop cut is possible 2', fakeAsync(() => {
                const inputStringArray = [ // {play, G, H} -> A -> {B, C} -> E -> {stop, F, H} /  F -> G -> A
                    ['A', 'B', 'C', 'E'],
                    ['A', 'B', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'E'],
                    ['A', 'B', 'D', 'E', 'H', 'A', 'B', 'C', 'E'],
                ];

                let dfg = new DirectlyFollows();
                dfg.setDFGfromStringArray(inputStringArray)

                const result = FallthroughHelper.isLoopCutPossible(dfg);
                expect(result).toBe(true);
            }));

            it('should return false when loop cut is not possible 1', fakeAsync(() => {
                const inputStringArray = [
                    ['A', 'B', 'C', 'E'],
                    ['A', 'B', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'E'],
                    ['A', 'B', 'D', 'E', 'H', 'A', 'B', 'C', 'E'],
                    ['A', 'B', 'F']
                ];

                let dfg = new DirectlyFollows();
                dfg.setDFGfromStringArray(inputStringArray)

                const result = FallthroughHelper.isLoopCutPossible(dfg);
                expect(result).toBe(false);
            }));

        });
    */


});
