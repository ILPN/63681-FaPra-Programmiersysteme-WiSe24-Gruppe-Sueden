import {AfterViewInit, Component, effect, EventEmitter, Input, input, OnDestroy, Output, signal, WritableSignal} from "@angular/core";
import {Node, NodeType} from "../../../classes/graph/node";
import {Edge} from "../../../classes/graph/edge";
import {PhysicsHelper} from "../../../helper/PhysicsHelper";
import {SelectionService} from "../../../services/selection.service";
import {PolygonHelper} from "../../../helper/PolygonHelper";
import {DirectlyFollows} from "../../../classes/directly-follows";
import {NodeComponent} from "../node/node.component";
import {EdgeComponent} from "../edge/edge.component";

@Component({
    selector: 'g[DFG]',
    templateUrl: 'dfg.component.html',
    imports: [
        NodeComponent,
        EdgeComponent
    ],
    standalone: true
})
export class DfgComponent implements AfterViewInit, OnDestroy {

    @Output() nodeMouseDown: EventEmitter<Node> = new EventEmitter()
    @Output() nodeMouseUp: EventEmitter<Node> = new EventEmitter()

    @Input() width = 800
    @Input() height = 600
    dfg = input.required<DirectlyFollows>()
    useSpringEmbedder = input.required<boolean>()

    nodes: Array<Node> = []
    edges: Array<Edge> = []
    physicsInterval: number = -1

    protected showNodes: WritableSignal<boolean> = signal(false)

    constructor(private selectionService: SelectionService) {
        effect(() => {
            this.clearDFG()
            this.initDfg()
        }, {allowSignalWrites: true})

        effect(() => {
            this.showNodes.set(this.selectionService.selectedDfg()?.id === this.dfg().id)
            clearInterval(this.physicsInterval)
            this.ngAfterViewInit()
        }, {allowSignalWrites: true})

        effect(() => { //writing nodes laying inside polygon to SelectionService onSelectionPolygonChange
            const polygon = selectionService.lassoSelectionPolygon()
            const selectedNodes: Array<Node> = []
            for(const node of this.nodes) {
                if(PolygonHelper.isPointInPolygon(node.x, node.y, polygon)) {
                    node.isSelected = true
                    selectedNodes.push(node)
                }
            }
            selectionService.selectedNodes.update(alreadySelectedNodes => alreadySelectedNodes.concat(selectedNodes))
        }, {allowSignalWrites: true})
    }

    ngOnDestroy(): void {
        clearInterval(this.physicsInterval)
    }

    ngAfterViewInit(): void {
        this.startSimulation()
    }

    startSimulation() {
        this.physicsInterval = setInterval(() => {
            this.updatePhysics()
        }, 5)
    }

    updatePhysics() {
        if(this.useSpringEmbedder()) {
            PhysicsHelper.calculateRepulsionForce(this.nodes)
            PhysicsHelper.calculateAttractionForce(this.edges)
        }
        PhysicsHelper.updateNodePositions(this.nodes, this.width, this.height)
    }

    clearDFG(): void {
        this.nodes = []
        this.edges = []
    }

    initDfg() {
        const dfg = this.dfg()
        if(!dfg) return

        for(const node of dfg.getNodes()) {
            this.addNode(node)
        }
        this.addNode("play")
        this.addNode("stop")

        for(const arc of dfg.arcs) {
            //look up source & target
            const sourceNode = this.findNode(arc.source as string)
            const targetNode = this.findNode(arc.target as string)
            if(!sourceNode || !targetNode) return console.log("Didnt find source or target for Arc: ", arc)
            this.edges.push({source: sourceNode, target: targetNode, bidirectional: false})
        }
        //process bidirectionality
        this.edges = this.edges.map(edge => {
            // Check if the reverse arc exists
            const isBidirectional = this.edges.some(
                other => other.source === edge.target && other.target === edge.source
            )
            return { ...edge, bidirectional: isBidirectional }
        })
    }

    private addNode(name: string): void {
        this.nodes.push({
            name: name,
            x: (this.width / 2) * Math.random(),
            y: (this.height / 2) * Math.random(),
            vx: 0,
            vy: 0,
            isDragged: false,
            isSelected: false,
            width: PhysicsHelper.nodeDiameter,
            height: PhysicsHelper.nodeDiameter,
            type: NodeType.node
        })
    }

    private findNode(name: string): Node | undefined {
        return this.nodes.find(node => node.name === name)
    }
}
