import {DirectlyFollows} from "../classes/directly-follows";

export class FallthroughHelper {

    /**
     * Detects fallthrough by checking all cut conditions using reachability matrix, footprint matrix, WCC, SCC.
     *
     * @param dfg - Directly Follows Graph object.
     * @returns True if fallthrough is inevitable.
     */
    public static isFallthrough(dfg: DirectlyFollows): [boolean, string] {
        // Base case
        if (dfg.getNodes().size === 1) {
            if (dfg.getArcs().length === 0) {
                return [false, 'Base Case'];
            } else if (dfg.getArcs().length === 1) {
                return [false, 'Loop Cut of length 1 possible'];
            }
        }

        const nodesAsArray =  Array.from(dfg.getNodes()).sort();
        const reachabilityMatrix = this.computeReachabilityMatrix(dfg);
        const footprintMatrix = this.computeFootprintMatrix(dfg);

        // XOR-Cut detection
        if (this.isXORCutPossible(dfg)) {
            return [false, 'XOR Cut possible'];
        }

        // Sequence-Cut detection
        if (this.isSequenceCutPossible(nodesAsArray, reachabilityMatrix)) {
            return [false, 'Sequence Cut possible'];
        }

        const inverseFootprintMatrix = this.invertFootprintMatrix(footprintMatrix);

        // Parallel-Cut detection
        if (this.isParallelCutPossible(dfg, nodesAsArray, inverseFootprintMatrix)) {
            return [false, 'Parallel Cut possible'];
        }

        // Loop-Cut detection
        if (this.isLoopCutPossible(dfg)) {
            return [false, 'Loop Cut possible'];
        }

        return [true, 'Fall Through'];
    }

    // TODO: XOR-Cut detection logic
    public static isXORCutPossible(dfg: DirectlyFollows): boolean {
        return false;
    }

    public static isSequenceCutPossible(nodesAsArray: string[], reachabilityMatrix: boolean[][]): boolean {
        // Index-Mapping for nodes
        const mapping: Record<string, number> = {};
        nodesAsArray.forEach((str, index) => {
            mapping[str] = index;
        });

        // Initializing: one component per node, component as subarray
        let components: string[][] = nodesAsArray.map(node => [node]);

        // Merging pairwise reachable components and pairwise unreachable components using reachabilityMatrix (SCCs)
        for (let i = 0; i < nodesAsArray.length; i++) {
            for (let j = i + 1; j < nodesAsArray.length; j++) {
                if (reachabilityMatrix[i][j] && reachabilityMatrix[j][i]) { // pairwise reachable
                    // Find component I, which includes i-th node, and put all nodes of the component J which includes j-th node, into I and delete J
                    let componentWithJ = components.find(subArray => subArray.includes(nodesAsArray[j])) ?? [];
                    let componentWithI = components.find(subArray => subArray.includes(nodesAsArray[i])) ?? [];
                    // Only merge if they are different components
                    if (componentWithJ !== componentWithI) {
                        components = this.mergeComponents(components, componentWithI, componentWithJ);
                    }
                }
            }
        }

        // Building reachability matrix on components (SCCs)
        const n = components.length;
        let SCCsReachabilityMatrix: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                for (let k = 0; k < components[i].length; k++) {
                    for (let l = 0; l < components[j].length; l++) {
                        if (reachabilityMatrix[mapping[components[i][k]]][mapping[components[j][l]]]) {
                            SCCsReachabilityMatrix[i][j] = true;
                        } else if (reachabilityMatrix[mapping[components[j][l]]][mapping[components[i][k]]]){
                            SCCsReachabilityMatrix[j][i] = true;
                        }
                    }
                }
            }
        }

        // Save original components before merging
        const cloneOfComponents: string[][] = [];
        for (let i = 0; i < components.length; i++) {
            cloneOfComponents.push([...components[i]]);
        }

        // Merge pairwise unreachable components
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (!SCCsReachabilityMatrix[i][j] && !SCCsReachabilityMatrix[j][i]) { // components pairwise unreachable
                    // Find the subarrays that contain the target subcomponent
                    let componentWithJSubcomponent = components.find(subArray => subArray.includes(cloneOfComponents[j][0])) ?? [];
                    let componentWithISubcomponent = components.find(subArray => subArray.includes(cloneOfComponents[i][0])) ?? [];
                    // Only merge if they are different components
                    if (componentWithJSubcomponent !== componentWithISubcomponent) {
                        components = this.mergeComponents(components, componentWithISubcomponent, componentWithJSubcomponent);
                    }
                }
            }
        }
        // If there is more than one component after merging, return true indicating sequence cut is possible
        return components.length > 1;

    }

    public static isParallelCutPossible(dfg: DirectlyFollows, nodesAsArray: string[], inverseFootprintMatrix: string[][]): boolean {

        const wccs = this.computeWCCsFromFootprintMatrix(nodesAsArray, inverseFootprintMatrix);
        if (wccs.length < 2) {
            return false;
        }

        let allWCCsValid = true;
        for (const wcc of wccs) {
            const containsPlayNode = wcc.some(node => dfg.getPlayNodes()?.has(node));
            const containsStopNode = wcc.some(node => dfg.getStopNodes()?.has(node));

            if (!containsPlayNode || !containsStopNode) {
                allWCCsValid = false;
                break; // Exit the loop early if a WCC is invalid
            }
        }
        return allWCCsValid;
    }

    // TODO: Loop-Cut detection logic
    public static isLoopCutPossible(dfg: DirectlyFollows): boolean {
        return false;
    }


    public static computeReachabilityMatrix(dfg: DirectlyFollows): boolean[][] {
        const nodesAsArray = Array.from(dfg.getNodes());
        nodesAsArray.sort();
        const n = nodesAsArray.length;
        let reachabilityMatrix = Array.from({ length: n }, () => Array(n).fill(false));

        // mark arcs as directly reachable
        nodesAsArray.forEach((source, i) => {
            nodesAsArray.forEach((target, j) => {
                if (dfg.hasArc(source, target)) {
                    reachabilityMatrix[i][j] = true;
                }
            });
        });

        // Floyd-Warshall-Algorithm for transitive closure
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (reachabilityMatrix[i][k] && reachabilityMatrix[k][j]) {
                        reachabilityMatrix[i][j] = true;
                    }
                }
            }
        }
        return reachabilityMatrix;
    }

    public static computeFootprintMatrix(dfg: DirectlyFollows): string[][] {
        const nodesAsArray =  Array.from(dfg.getNodes());
        nodesAsArray.sort();
        const n = nodesAsArray.length;
        let footprintMatrix: string[][] = Array.from({ length: n }, () => Array(n).fill('-'));

        nodesAsArray.forEach((source, i) => {
            nodesAsArray.forEach((target, j) => {
                const hasArc = dfg.hasArc(source, target);
                const hasReverseArc = dfg.hasArc(target, source);

                if (hasArc && !hasReverseArc) {
                    footprintMatrix[i][j] = '→';
                } else if (!hasArc && hasReverseArc) {
                    footprintMatrix[i][j] = '←';
                } else if (hasArc && hasReverseArc) {
                    footprintMatrix[i][j] = '||';
                } else {
                    footprintMatrix[i][j] = '#';
                }
            });
        });
        return footprintMatrix;
    }

    public static invertFootprintMatrix(footprintMatrix: string[][]): string[][] {
        // Clone the footprint-matrix to avoid modifying the original
        const inverseFootprintMatrix = footprintMatrix.map(row => [...row]);

        for (let i = 0; i < footprintMatrix.length; i++) {
            for (let j = 0; j < footprintMatrix[i].length; j++) {
                switch (footprintMatrix[i][j]) {
                    case '→':
                        inverseFootprintMatrix[i][j] = '←';
                        break;
                    case '←':
                        inverseFootprintMatrix[i][j] = '→';
                        break;
                    case '||':
                        inverseFootprintMatrix[i][j] = '#';
                        break;
                    case '#':
                        inverseFootprintMatrix[i][j] = '||';
                        break;
                    default:
                        inverseFootprintMatrix[i][j] = footprintMatrix[i][j]; // Copy any other values unchanged
                }
            }
        }
        return inverseFootprintMatrix;
    }

    public static mergeComponents(components: string[][], componentA: string[], componentB: string[]): string[][] {
        const mergedComponent = Array.from(new Set([...componentA, ...componentB]));

        components = components.filter(c => c !== componentA && c !== componentB);
        components.push(mergedComponent);

        return components;
    }

    public static computeWCCsFromFootprintMatrix(nodes: string[], footprintMatrix: string[][]): string[][] {
        const n = nodes.length;
        const visited = new Set<string>();
        const wccs: string[][] = [];

        // Build an adjacency list from the footprint matrix
        const adjacencyList = new Map<string, string[]>();

        for (let i = 0; i < n; i++) {
            adjacencyList.set(nodes[i], []);
            for (let j = 0; j < n; j++) {
                if (footprintMatrix[i][j] !== '#') {
                    adjacencyList.get(nodes[i])?.push(nodes[j]);
                }
            }
        }

        // Helper function: DFS to collect nodes in the same WCC
        const dfs = (node: string, currentWCC: string[]) => {
            visited.add(node);
            currentWCC.push(node);

            (adjacencyList.get(node) || []).forEach((neighbor) => {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, currentWCC);
                }
            });
        };

        // Explore all nodes to find WCCs
        nodes.forEach((node) => {
            if (!visited.has(node)) {
                const currentWCC: string[] = [];
                dfs(node, currentWCC);
                wccs.push(currentWCC);
            }
        });
        return wccs;
    }


}

