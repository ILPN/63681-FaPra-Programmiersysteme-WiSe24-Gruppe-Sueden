import {AfterViewInit, Component, effect, ElementRef, input, OnDestroy, ViewChild, ViewEncapsulation} from '@angular/core'
import {Node, NodeType} from "../../classes/graph/node"
import {ProcessGraphService} from "../../services/process-graph.service";
import {CutType} from "../../classes/cut-type.enum";
import {SelectionType} from "../../classes/selection-type.enum";
import {Point} from "../../classes/point";
import {SelectionService} from "../../services/selection.service";
import {Edge} from "../../classes/graph/edge";
import {ProcessGraph} from "../../classes/process-graph";
import {DfgNode} from "../../classes/graph/dfg-node";
import {PhysicsHelper} from "../../helper/PhysicsHelper";
import {NodeComponent} from "./node/node.component";
import {PlaceComponent} from "./place/place.component";
import {EventLogComponent} from "./event-log/event-log.component";
import {EdgeComponent} from "./edge/edge.component";
import {DfgComponent} from "./dfg/dfg.component";
import {CursorPipe} from "./cursor.pipe";
import {DisplayService} from "../../services/display.service";

@Component({
    selector: 'app-canvas',
    templateUrl: './canvas.component.html',
    styleUrls: ['./canvas.component.scss'],
    standalone: true,
    imports: [
        NodeComponent,
        PlaceComponent,
        EventLogComponent,
        EdgeComponent,
        DfgComponent,
        CursorPipe
    ],
    encapsulation: ViewEncapsulation.None
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
    @ViewChild('svgCanvas', { static: true }) svgCanvas!: ElementRef

    cutType = input.required<CutType>()
    selectionType = input.required<SelectionType>()
    useSpringEmbedder = input.required<boolean>()

    protected isDrawing: boolean = false
    protected lassoPath = ''
    private lassoStart: Point = {x: 0, y: 0}
    private selectionPolygon: Array<{x: number, y: number}> = []

    private resizeObserver!: ResizeObserver
    private physicsInterval: number = -1
    draggingNode: Node | null = null

    places: Array<Node> = []
    dfgs: Array<DfgNode> = []
    edges: Array<Edge> = []
    nodes: Array<Node | DfgNode> = []
    transitions: Array<Node> = []

    constructor(protected processGraphService: ProcessGraphService,
                protected selectionService: SelectionService,
                protected displayService: DisplayService) {
        effect(() => { //every time the graphSignal changes
            const graph = processGraphService.graphSignal()
            selectionService.reset()
            this.reset()
            this.initGraph(graph)
        }, {allowSignalWrites: true})
    }

    ngAfterViewInit() {
        // Access the SVG element's width
        this.initializeResizeObserver()
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
        PhysicsHelper.updateNodePositions(this.nodes, this.displayService.width(), this.displayService.height(), false)
    }

    ngOnDestroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
        if (this.physicsInterval !== -1) clearInterval(this.physicsInterval)
    }

    initializeResizeObserver() {
        const svgElement = this.svgCanvas.nativeElement as SVGElement
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === svgElement) {
                    this.displayService.width.set(entry.contentRect.width)
                    this.displayService.height.set(entry.contentRect.height)
                }
            }
        })

        this.resizeObserver.observe(svgElement)
    }

    // HANDLING OF MOUSE EVENTS
    onMouseDown(event: MouseEvent) {
        switch(this.selectionType()) {
            case SelectionType.CLICK:
                break
            case SelectionType.LASSO:
                this.lassoSelectionStart(event)
                break
            case SelectionType.NONE:
                // this.onDragStart(event)
                break
        }
    }

    onMouseMove(event: MouseEvent) {
        switch(this.selectionType()) {
            case SelectionType.CLICK:
                break
            case SelectionType.LASSO:
                this.lassoSelectionMove(event)
                break
            case SelectionType.NONE:
                this.onDragMove(event)
                break
        }
    }

    onMouseUp() {
        switch(this.selectionType()) {
            case SelectionType.CLICK:
                break
            case SelectionType.LASSO:
                this.lassoSelectionEnd()
                break
            case SelectionType.NONE:
                this.onDragEnd()
                break
        }
    }

    nodeMouseDown(node: Node) {
        switch(this.selectionType()) {
            case SelectionType.CLICK:
                this.toggleNodeSelected(node)
                break
            case SelectionType.NONE:
                this.onDragStart(node)
                break
        }
    }

    nodeMouseUp() {
        switch(this.selectionType()) {
            case SelectionType.NONE:
                this.onDragEnd()
                break
        }
    }

    //handling of SELECTIONTYPE.NONE (Dragging)
    onDragStart(node: Node) {
        this.draggingNode = node
        node.isDragged = true
    }

    onDragMove(event: MouseEvent) {
        if(!this.draggingNode) return
        this.draggingNode.x = event.offsetX
        this.draggingNode.y = event.offsetY
    }

    onDragEnd() {
        if(!this.draggingNode) return
        this.draggingNode.isDragged = false
        this.draggingNode = null
    }

    //handling of SELECTIONTYPE.LASSO
    lassoSelectionStart(event: MouseEvent) {
        this.isDrawing = true
        const point = { x: event.offsetX, y: event.offsetY };
        this.selectionPolygon = [point]
        this.lassoStart = point
        this.lassoPath = `M ${event.offsetX} ${event.offsetY}`
    }

    lassoSelectionMove(event: MouseEvent) {
        event.preventDefault()
        if (!this.isDrawing) return

        const newPoint = { x: event.offsetX, y: event.offsetY }
        this.selectionPolygon.push(newPoint)
        this.lassoPath += ` L ${event.offsetX} ${event.offsetY}`
    }

    lassoSelectionEnd() {
        if (!this.isDrawing) return

        this.lassoPath += ` L ${this.lassoStart.x} ${this.lassoStart.y}`
        this.isDrawing = false
        this.selectionService.updatePolygon(this.selectionPolygon)
        this.resetLasso()
    }

    resetLasso() {
        this.selectionPolygon = []
        this.lassoPath = ''
    }

    toggleNodeSelected(node: Node): void {
        if(node.type !== NodeType.node || node.name === 'play' || node.name === 'stop') return //only allow adding nodes (not dfg or places)
        this.selectionService.toggleNodeSelected(node)
    }

    dfgClicked(dfg: DfgNode) {
        this.selectionService.selectDfg(dfg)
    }

    initGraph(graph: ProcessGraph | null) {
        if(!graph) return

        this.dfgs =[...graph.dfgSet]
        this.nodes.push(...this.dfgs)
        this.places = [...graph.places]
        this.nodes.push(...this.places)
        this.transitions =[...graph.transitions]
        this.nodes.push(...this.transitions)

        for(const arc of graph.arcs) {
            //look up source & target
            const sourceNode = this.findNode((arc.source as Node).name)
            const targetNode =  this.findNode((arc.target as Node).name)
            if (!sourceNode || !targetNode) return console.log("Didnt find source or target for Arc: ", arc)
            this.edges.push({source: sourceNode, target: targetNode, bidirectional: false})
        }

        //Replace Tau Node Names
        for (let node of this.nodes){
            if (node.name.startsWith("TAU_")){
                node.name = "τ"
            }
        }

    }

    private findNode(name: string): Node | DfgNode | null {
        const index = this.nodes.findIndex(node => node.name === name)
        if(index !== -1) return this.nodes[index]

        return null
    }

    reset(): void {
        this.dfgs = []
        this.places = []
        this.edges = []
        this.nodes = []
        this.transitions = []
    }
}
