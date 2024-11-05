export class DirectlyFollows {
    successorMap: Map<string, Set<string>>
    predecessorMap: Map<string, Set<string>>

    constructor() {
        this.successorMap = new Map<string, Set<string>>()
        this.predecessorMap = new Map<string, Set<string>>()
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

    getSuccessor(node: string): Set<string> | undefined {
        return this.successorMap.get(node)
    }

    getPredecessor(node: string): Set<string> | undefined {
        return this.predecessorMap.get(node)
    }

    //gibt alle Knoten mit Ausnahme von play/stop zurück
    getNodes(): Set<string> {
        let result = new Set<string>
        for (let key of this.successorMap.keys()) {
            if (!["play", "stop"].includes(key)) {
                result.add(key)
            }
        }
        return result
    }

    getPlayNodes(): Set<string> | undefined {
        return this.successorMap.get("play")
    }


    getStopNodes(): Set<string> | undefined {
        return this.predecessorMap.get("stop")
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
        const successorNodeSet = this.getSuccessor(originNode)
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

    createPredecessorMap(): void {
        this.predecessorMap.clear()
        for (const [origin, successorSet] of this.successorMap) {
            for (const successor of successorSet) {
                this.addPredecessor(successor, origin)
            }
        }
    }


}
