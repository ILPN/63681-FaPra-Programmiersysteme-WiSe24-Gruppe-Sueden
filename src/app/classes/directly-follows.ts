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

}
