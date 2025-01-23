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
            if (dfg.getArcs().length === 2) {
                return [false, 'Base Case'];
            } else if (dfg.getArcs().length > 2) {
                return [false, 'Loop Cut of length 1 possible'];
            }
        }

        const nodesAsArray = Array.from(dfg.getNodes()).sort();
        const reachabilityMatrix = this.computeReachabilityMatrix(nodesAsArray, dfg);
        const footprintMatrix = this.computeFootprintMatrix(nodesAsArray, dfg);

        // XOR-Cut detection
        if (this.isXORCutPossible(nodesAsArray, footprintMatrix)) {
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
        if (this.isLoopCutPossible(dfg, nodesAsArray, footprintMatrix)) {
            return [false, 'Loop Cut possible'];
        }

        return [true, 'Fall Through'];
    }

    public static isXORCutPossible(nodesAsArray: string[], footprintMatrix: string[][]): boolean {
        const wccs = this.computeWCCsFromFootprintMatrix(nodesAsArray, footprintMatrix);
        return wccs.length > 1;
    }

    public static isSequenceCutPossible(nodesAsArray: string[], reachabilityMatrix: boolean[][]): boolean {
        // Index-Mapping for nodes
        const mapping = this.mapArrayIndex(nodesAsArray)

        // Initializing: one component per node, component as subarray
        let components: string[][] = nodesAsArray.map(node => [node]);

        // Merging pairwise reachable components (SCCs) using reachabilityMatrix
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

        // Building reachability matrix of components
        const n = components.length;
        let SCCsReachabilityMatrix: boolean[][] = Array.from({length: n}, () => Array(n).fill(false));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                for (let k = 0; k < components[i].length; k++) {
                    for (let l = 0; l < components[j].length; l++) {
                        if (reachabilityMatrix[mapping[components[i][k]]][mapping[components[j][l]]]) {
                            SCCsReachabilityMatrix[i][j] = true;
                        } else if (reachabilityMatrix[mapping[components[j][l]]][mapping[components[i][k]]]) {
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
        // building wccs from inverted footprint-matrix
        const wccs = this.computeWCCsFromFootprintMatrix(nodesAsArray, inverseFootprintMatrix);
        if (wccs.length < 2) {
            return false;
        }

        let allWCCsValid = true;
        for (const wcc of wccs) {
           /* const containsPlayNode = wcc.some(node => dfg.getPlayNodes()?.has(node))
            const containsStopNode = wcc.some(node => dfg.getStopNodes()?.has(node))
            if (!containsPlayNode || !containsStopNode){
                allWCCsValid = false
                break; // Exit the loop early if WCC is invalid
            }
            */
            for (let node of wcc){
                 if (!dfg.existsFullPathOverNode(node, new Set(wcc))){
                 allWCCsValid = false;
                  break;
                }
                }

        }
        return allWCCsValid;
    }

    // TODO: Loop-Cut detection logic hat noch ein problem
    /* zB wird hier loop mittels loo nicht erkannt
    c d e f d loop c d e f d +
    a b d e loop a b d e +
    b a d e loop b a d e +
    c g loop c g
     */
    public static isLoopCutPossible(dfg: DirectlyFollows, nodesAsArray: string[], footprintMatrix: string[][]): boolean {
        const mapping = this.mapArrayIndex(nodesAsArray);
        const playNodes = Array.from(dfg.getPlayNodes() ?? []);
        const stopNodes = Array.from(dfg.getStopNodes() ?? []);
        let workingMatrix: string[][]
        workingMatrix = this.removeIncomingEdges(mapping, footprintMatrix, playNodes)
        workingMatrix = this.removeOutgoingEdges(mapping, workingMatrix, stopNodes)

        let wCCs = this.computeWCCsFromFootprintMatrix(nodesAsArray, workingMatrix);
        for (let wcc of wCCs){
            console.log('wcc:')
            for (let node of wcc) {
             console.log(node);
            }
            console.log('\n')
        }
        let mainWCC: string[] = []

        for (let i = 0; i < wCCs.length; i++) {
            let wCC = wCCs[i];
            // merge jene WCCs in mainWCC, die Play oder StopNodes enthalten
            if (wCC.some(node => dfg.getPlayNodes()?.has(node) || dfg.getStopNodes()?.has(node))) {
                mainWCC = Array.from(new Set([...mainWCC, ...wCC]));
                // lösche den aktuellen WCC
                wCCs.splice(i, 1);
                i--;
            }
        }
        console.log('main wcc:')
        for (let node of mainWCC){
            console.log(node)
        }
        const amountOfWCCs = wCCs.length;
        // nun sollten alle WCCs mit play/stopNodes in der mainWCC sein, in WCCs sollten sämtliche eventuelle redo-parts sein
        console.log('wccs:' + amountOfWCCs)
        for (let wcc of wCCs){
            console.log('wcc:')
            for (let node of wcc) {
                console.log(node);
            }
            console.log('\n')
        }
        if (amountOfWCCs === 0) {
            return false;
        }

        // Erstelle Objekte für WCCs und die Main Component
        const mainComponent = {
            nodes: [] as string[],   // Array für die Nodes
            FPM: [] as string[][],   // Footprint Matrix (2D-Array)
            startNodes: [] as string[], // Array für die Startknoten
            stopNodes: [] as string[],  // Array für die Stopknoten
        };
        mainComponent.FPM = this.removeIrrelevantEdges(workingMatrix, mainWCC, mapping);
        mainComponent.nodes = mainWCC;
        const startAndStopNodesOfmainFPM = this.findStartAndStopNodes(mainComponent.FPM, mainWCC, mapping, nodesAsArray)

        mainComponent.startNodes = startAndStopNodesOfmainFPM.startNodes;
        mainComponent.stopNodes = startAndStopNodesOfmainFPM.stopNodes;
        console.log('mstart: ' +mainComponent.startNodes);
        console.log('mstop: '+ mainComponent.stopNodes);

        const wccArray: { nodes: string[], FPM: string[][], startNodes: string[], stopNodes: string[] }[] = [];
        for (let i = 0; i < wCCs.length; i++) {
            const wCC = {
                nodes: wCCs[i],
                FPM: this.removeIrrelevantEdges(workingMatrix, wCCs[i], mapping),
                startNodes: [] as string[],
                stopNodes: [] as string[],
            };
            const startStopNodes = this.findStartAndStopNodes(wCC.FPM, wCC.nodes, mapping, nodesAsArray)
            wCC.startNodes = startStopNodes.startNodes;
            wCC.stopNodes = startStopNodes.stopNodes;
            wccArray.push(wCC);
        }
        for (let wcc of wccArray){
            console.log('wstart: ' +wcc.startNodes);
            console.log('wstop: '+ wcc.stopNodes);
        }

        // nun haben wir Footprint Matrizen für die main-component sowie alle redo-components und die start / stopknoten der components...
        // nun müssen wir mittels arcs überprüfen ob die ausgehenden und eingehenden kanten richtig verlaufen..

        // lösche nun alle Arcs, die innerhalb von Komponenten sind

        let connectingArcs = [...dfg.getArcs()];
        connectingArcs = connectingArcs.filter(arc => {
            return !(mainComponent.nodes.includes(arc.source as string) && mainComponent.nodes.includes(arc.target as string)) &&
                !(arc.source === "play") && !(arc.target === "stop");
        })
        for (let wcc of wccArray) {
            connectingArcs = connectingArcs.filter(arc => {
                // Kantenverbindungen innerhalb werden rausgefiltert

                return !(wcc.nodes.includes(arc.source as string) && wcc.nodes.includes(arc.target as string))
            })
        }
        //connectingArcs enthält jetzt alle Kanten, die zwischen Komponenten verbinden
        let tempArcs = [...connectingArcs];

        for (let wcc of wccArray) {
            tempArcs = tempArcs.filter(arc => {
                // Kantenverbindungen von stopnodes des wcc nach start von Main werden rausgefiltert
                return !(wcc.stopNodes.includes(arc.source as string) && mainComponent.startNodes.includes(arc.target as string)) &&

                    // Kantenverbindungen von stopnodes des Main nach start des wcc werden rausgefiltert
                    !(mainComponent.stopNodes.includes(arc.source as string) && wcc.startNodes.includes(arc.target as string));
            })
        }

        // nun sollte unser tempArcs array leer sein
        if (tempArcs.length !== 0) {
            return false;
        }
        // nun bleibt nur mehr zu testen ob jeder Knoten von WCC stop zu allen Maincomponent.play führt ...
        for (let wcc of wccArray) {
            for (let sourceNode of wcc.stopNodes) {
                let isConnectedToAllStartNodes = false
                for (let targetNode of mainComponent.startNodes) {
                    isConnectedToAllStartNodes = connectingArcs.some(arc => {
                        return arc.source === sourceNode && arc.target === targetNode
                    })
                }
                if (!isConnectedToAllStartNodes) {
                    return false;
                }
            }
        }
        // sowie, ob alle knoten von wcc.start von allen knoten aus Maincomponent.stop erreicht werden..
        for (let wcc of wccArray) {
            for (let targetNode of wcc.startNodes) {
                let isConnectedFromAllStopNodes = false
                for (let sourceNode of mainComponent.stopNodes) {
                    isConnectedFromAllStopNodes = connectingArcs.some(arc => {
                        return arc.source === sourceNode && arc.target === targetNode
                    })
                }
                if (!isConnectedFromAllStopNodes) {
                    return false;
                }
            }
        }
        return true;
    }


    public static computeReachabilityMatrix(nodesAsArray: string[], dfg: DirectlyFollows): boolean[][] {
        const n = nodesAsArray.length;
        let reachabilityMatrix = Array.from({length: n}, () => Array(n).fill(false));

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

    public static computeFootprintMatrix(nodesAsArray: string[], dfg: DirectlyFollows): string[][] {
        let footprintMatrix: string[][] = Array.from({length: nodesAsArray.length}, () => Array(nodesAsArray.length).fill('-'));

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
//TODO: mby sthg still wrong here
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

    public static mapArrayIndex(nodesAsArray: string[]): Record<string, number> {
        const mapping: Record<string, number> = {};
        nodesAsArray.forEach((str, index) => {
            mapping[str] = index;
        });
        return mapping
    }

    public static removeIncomingEdges(
        nodesIndexMap: Record<string, number>,
        footprintMatrix: string[][],
        playNodes: string[]
    ): string[][] {
        // Erstelle eine Kopie der Matrix
        const updatedMatrix = footprintMatrix.map(row => [...row]);
        // Durchlaufe alle PlayNodes
        playNodes.forEach(node => {
            // Hole den Index aus dem Mapping
            const index = nodesIndexMap[node];
            if (index === undefined) {
                console.log(`Node ${node} not found in nodesIndexMap`);
                return;
            }
            // gehe Spalte von playNode durch
            for (let rowIndex = 0; rowIndex < updatedMatrix.length; rowIndex++) {
                //ändere nicht die Diagonale
                if (rowIndex !== index) {
                    if (updatedMatrix[rowIndex][index] === '→') {
                        updatedMatrix[rowIndex][index] = '#';
                    } else if (updatedMatrix[rowIndex][index] === '||') {
                        updatedMatrix[rowIndex][index] = '←';
                    }
                }
            }
            // gehe Zeile von playNode durch
            for (let colIndex = 0; colIndex < updatedMatrix[index].length; colIndex++) {
                // wieder nicht Diagonale ändern
                if (colIndex !== index) {
                    if (updatedMatrix[index][colIndex] === '←') {
                        updatedMatrix[index][colIndex] = '#';
                    } else if (updatedMatrix[index][colIndex] === '||') {
                        updatedMatrix[index][colIndex] = '→';
                    }
                }
            }
        });
        return updatedMatrix;
    }

    public static removeOutgoingEdges(
        nodesIndexMap: Record<string, number>,
        footprintMatrix: string[][],
        stopNodes: string[]
    ): string[][] {
        // Erstelle eine Kopie der Matrix
        const updatedMatrix = footprintMatrix.map(row => [...row]);
        // Durchlaufe alle PlayNodes
        stopNodes.forEach(node => {
            // Hole den Index aus dem Mapping
            const index = nodesIndexMap[node];
            if (index === undefined) {
                console.log(`Node ${node} not found in nodesIndexMap`);
                return;
            }
            // gehe Spalte von playNode durch
            for (let rowIndex = 0; rowIndex < updatedMatrix.length; rowIndex++) {
                //ändere nicht die Diagonale
                if (rowIndex !== index) {
                    if (updatedMatrix[rowIndex][index] === '←') {
                        updatedMatrix[rowIndex][index] = '#';
                    } else if (updatedMatrix[rowIndex][index] === '||') {
                        updatedMatrix[rowIndex][index] = '→';
                    }
                }
            }
            // gehe Zeile von playNode durch
            for (let colIndex = 0; colIndex < updatedMatrix[index].length; colIndex++) {
                // wieder nicht Diagonale ändern
                if (colIndex !== index) {
                    if (updatedMatrix[index][colIndex] === '→') {
                        updatedMatrix[index][colIndex] = '#';
                    } else if (updatedMatrix[index][colIndex] === '||') {
                        updatedMatrix[index][colIndex] = '←';
                    }
                }
            }
        });
        return updatedMatrix;
    }

    public static removeIrrelevantEdges(
        footprintMatrix: string[][],
        validNodes: string[],
        nodesIndexMap: Record<string, number>
    ): string[][] {
        // Kopiere die Matrix, damit die ursprüngliche nicht verändert wird
        const updatedMatrix = footprintMatrix.map(row => [...row]);
        // erstelle ein array der ungültigen Indizes
        const invalidNodesIndexes: number[] = [];
        Object.keys(nodesIndexMap).forEach(node => {
            if (!validNodes.includes(node)) {
                invalidNodesIndexes.push(nodesIndexMap[node]);
            }
        });
        // ersetze alles in den unnötigen Zeilen durch #
        for (let i of invalidNodesIndexes) {
            for (let j = 0; j < updatedMatrix[i].length; j++) {
                // ersetze alles in den unnötigen Zeilen durch #
                updatedMatrix[i][j] = '#';
                // ersetze alles in den unnötigen Spalten durch #
                updatedMatrix[j][i] = '#';
            }
        }
        return updatedMatrix;
    }

    public static findStartAndStopNodes(
        footprintMatrix: string[][],
        validNodes: string[],
        nodesIndexMap: Record<string, number>,
        nodesAsArray: string[]
    ): { startNodes: string[], stopNodes: string[] } {
        const startNodes: string[] = [];
        const stopNodes: string[] = [];
        // erstelle Array der validen Nodes
        const nodesIndexes: number[] = [];
        Object.keys(nodesIndexMap).forEach(node => {
            if (validNodes.includes(node)) {
                nodesIndexes.push(nodesIndexMap[node]);
            }
        });
        for (let i of nodesIndexes) {
            let isStartNode = true;
            let isStopNode = true;
            for (let j of nodesIndexes) {
                if (j !== i) {
                    //gehe zeile entlang
                    if (footprintMatrix[j][i] === '→' || footprintMatrix[j][i] === '||') {
                        isStartNode = false;
                    }
                    if (footprintMatrix[j][i] === '←' || footprintMatrix[j][i] === '||') {
                        isStopNode = false;
                    }
                }
            }
            if (isStartNode) {
                startNodes.push(nodesAsArray[i])
            }
            if (isStopNode) {
                stopNodes.push(nodesAsArray[i])
            }
        }
        return {startNodes, stopNodes};
    }


    //For debugging..
    public static print2DArray(arr: string[][]): void {
        for (let row of arr) {
            console.log(row.join(' | ')); // Verbinde die Elemente der Zeile mit einem Trennzeichen (z.B. '|')
        }
    }
}

