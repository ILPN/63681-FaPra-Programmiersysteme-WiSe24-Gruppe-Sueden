import {Arc} from "./arc";

export class DirectlyFollows {
    id: number
    x: number = 0
    y: number = 0
    successorMap: Map<string, Set<string>>
    predecessorMap: Map<string, Set<string>>
    eventLog: string[][];
    nodes: Set<string>
    arcs: Arc[]


    //TODO: Arcs und Nodes aktualisieren
    constructor() {
        this.id = 0;
        this.successorMap = new Map<string, Set<string>>()
        this.predecessorMap = new Map<string, Set<string>>()
        this.eventLog = [];
        this.nodes = new Set<string>();
        this.arcs = [];
    }

    addSuccessor(origin: string, successor: string): void {
        if (!this.successorMap.has(origin)) {
            this.successorMap.set(origin, new Set<string>())
        }
        this.successorMap.get(origin)!.add(successor)
    }

    addPredecessor(origin: string, predecessor: string): void {
        if (!this.predecessorMap.has(origin)) {
            this.predecessorMap.set(origin, new Set<string>())
        }
        this.predecessorMap.get(origin)!.add(predecessor)
    }

    setEventLog(log: string[][]): void {
        this.eventLog = log;
    }

    getEventLog(): string[][] {
        return this.eventLog;
    }

    getSuccessors(node: string): Set<string> | undefined {
        return this.successorMap.get(node)
    }

    getPredecessors(node: string): Set<string> | undefined {
        return this.predecessorMap.get(node)
    }


    setNodes(): void {
        let nodeSet = new Set<string>
        for (let key of this.successorMap.keys()) {
            if (!["play", "stop"].includes(key)) {
                nodeSet.add(key)
            }
        }
        this.nodes = nodeSet;
    }

    //gibt alle Knoten mit Ausnahme von play/stop zurück
    getNodes(): Set<string> {
        return this.nodes;
    }

    getPlayNodes(): Set<string> | undefined {
        return this.successorMap.get("play")
    }


    getStopNodes(): Set<string> | undefined {
        return this.predecessorMap.get("stop")
    }

    generateArcs(): void {
        this.arcs = [];
        for (const [origin, successors] of this.successorMap.entries()) {
            for (const successor of successors) {
                const arc: Arc = {source: origin, target: successor};
                this.arcs.push(arc);
            }
        }
    }

    getArcs(): Arc[] {
        if (this.arcs.length == 0) {
            this.generateArcs()
        }
        return this.arcs;
    }

    getArcsOfSourceNode(source: string): Arc[] {
        return this.arcs.filter(arc => arc.source === source)
    }

    existsArcWithReason(source: string, wantedTargets: Set<string>): boolean {
        let arcsOfSource = this.getArcsOfSourceNode(source);
        let targetsOfSource = new Set(arcsOfSource.map(arc => arc.target as string));
        for (const target of wantedTargets) {
            if (!targetsOfSource.has(target)) {
                return false;
            }
        }
        return true
    }


    //TODO: Error-Handling und Null-Prüfung
    public setDFGfromStringArray(inputStringArray: string[][]): void {
        for (const trace of inputStringArray) {
            let tempElement = trace[0];
            this.addSuccessor("play", tempElement)
            let traceLength = trace.length;
            for (let i = 1; i < traceLength; i++) {
                this.addSuccessor(tempElement, trace[i]);
                tempElement = trace[i];
            }
            this.addSuccessor(trace[traceLength - 1], "stop")
        }
        this.createPredecessorMap();
        this.setEventLog(inputStringArray);
        this.setNodes();
        this.generateArcs();
    }


    private recursivePathDepthSearch(originNode: string,
                                     wanted: Set<string>,
                                     visited: Set<string>,
                                     nodesWithPath: Set<string>,
                                     allowedNodes?: Set<string>): boolean {
        //True, falls Knoten gefunden
        if (wanted.has(originNode) || nodesWithPath.has(originNode)) {
            return true
        }
        if (allowedNodes && !allowedNodes.has(originNode)) {
            return false
        }
        visited.add(originNode)
        const successorNodeSet = this.getSuccessors(originNode)
        if (successorNodeSet) {
            //gehe alle Folgeknoten durch
            for (let successorNode of successorNodeSet) {
                //Prüfe bereits gesucht
                if (!visited.has(successorNode)) {
                    if (this.recursivePathDepthSearch(successorNode, wanted, visited, nodesWithPath, allowedNodes)) {
                        nodesWithPath.add(successorNode)
                        return true
                    }
                }
            }
        }
        return false
    }

    existsPath(firstNodeSet: Set<string>, secondNodeSet: Set<string>, allowedNodes?: Set<string>): boolean {
        let nodesWithPath = new Set<string>()
        for (let node of firstNodeSet) {
            let visited = new Set<string>()
            if (this.recursivePathDepthSearch(node, secondNodeSet, visited, nodesWithPath, allowedNodes)) {
                nodesWithPath.add(node)
            } else {
                return false
            }
        }
        return true
    }

    // Prüft, ob ein Pfad play->node->stop über eine gegebene Knotenmenge existiert
    existsFullPathOverNode(node: string, allowedNodes: Set<string>): boolean {
        let tempAllowedNodes = new Set(allowedNodes);
        tempAllowedNodes.add("play")
        if (this.existsPath(new Set(["play"]), new Set([node]), tempAllowedNodes)) {
            if (this.existsPath(new Set([node]), new Set(["stop"]), tempAllowedNodes)) {
                return true;
            }
        }
        return false;
    }

    createPredecessorMap(): void {
        this.predecessorMap.clear()
        for (const [origin, successorSet] of this.successorMap) {
            for (const successor of successorSet) {
                this.addPredecessor(successor, origin)
            }
        }
    }

    setID(newID: number): void {
        this.id = newID
    }

    hasArc(source: string, target: string): boolean {
        const successors = this.successorMap.get(source);
        return successors !== undefined && successors.has(target);
    }

    isPatternExclusivelyRepeated(): boolean {
        let eventlog = this.eventLog;
        let isPatternRepeatedInATrace = false;
        let pattern = this.findRepeatedPattern(this.shortestNotEmptyTrace(eventlog));
        if (pattern.length === 0) {
            return false; // eventlog has only empty traces
        }

        // Check each row in the eventlog
        for (const row of eventlog) {
            if (!this.isRowValid(row, pattern)) {
                return false; // there is one invalid row (trace)
            } else {
                if (this.hasPatternMultipleTimes(row, pattern)) {
                    isPatternRepeatedInATrace ||= true; // at least one trace should have pattern multiple times
                }
            }
        }

        // isPatternRepeatedInATrace: there is at least one trace which has at least two times of pattern
        return isPatternRepeatedInATrace;
    }

    // Helper function which returns shortest but not empty trace, as candidate of pattern
    private shortestNotEmptyTrace(eventlog: string[][]): string[] {
        let shortestTrace: string[] = [];
        let minLength = Infinity;

        for (const row of eventlog) {
            // Skip empty rows
            if (row.length > 0 && row.length < minLength) {
                minLength = row.length;
                shortestTrace = row;
            }
        }
        return shortestTrace;
    }

    public findRepeatedPattern(row: string[]): string[] {
        const n = row.length;

        for (let patternLength = 1; patternLength <= Math.floor(n / 2); patternLength++) {
            if (n % patternLength !== 0) continue; // Skip if the array length is not divisible by the pattern length

            const pattern = row.slice(0, patternLength);
            let isRepeated = true;

            // Check if the entire array is composed of this pattern
            for (let i = 0; i < n; i++) {
                if (row[i] !== pattern[i % patternLength]) {
                    isRepeated = false;
                    break;
                }
            }

            if (isRepeated) {
                return pattern;
            }
        }
        return row; // If no smaller repeating pattern is found, return the array itself
    }

    public getRepeatedPattern(): string[] {
        let eventlog = this.eventLog ;
        return this.findRepeatedPattern(this.shortestNotEmptyTrace(eventlog));
    }

    // Helper function to check if a row matches the pattern
    private isRowValid(row: string[], pattern: string[]): boolean {
        const patternLength = pattern.length;
        const rowLength = row.length;

        // Row length must be a multiple of the pattern length
        if (rowLength % patternLength !== 0) {
            return false;
        }

        // Check each segment in the row
        for (let i = 0; i < rowLength; i += patternLength) {
            for (let j = 0; j < patternLength; j++) {
                if (row[i + j] !== pattern[j]) {
                    return false;
                }
            }
        }
        return true;
    }

    private hasPatternMultipleTimes(row: string[], pattern: string[]): boolean {
        let count = 0, len = pattern.length;
        for (let i = 0; i <= row.length - len; i++) {
            if (row.slice(i, i + len).every((v, j) => v === pattern[j])) {
                count++;
                i += len - 1; // Skip to the end of the match
            }
        }
        return count > 1;
    }

}
