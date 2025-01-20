import {AfterViewInit, Component, effect, ElementRef, OnDestroy, ViewChild, ViewEncapsulation} from '@angular/core'
import {Node, NodeType} from "../../classes/graph/node"
import {ProcessGraphService} from "../../services/process-graph.service";
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
import {MatIconButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {IsNodeSelectedPipe} from "./is-node-selected.pipe";
import {ToolbarService} from "../../services/toolbar.service";
import {MatTab, MatTabGroup} from "@angular/material/tabs";
import {injectLocalStorage} from "../../hooks/inject-local-storage";

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
        CursorPipe,
        MatIconButton,
        MatIcon,
        MatTooltip,
        IsNodeSelectedPipe,
        MatTabGroup,
        MatTab
    ],
    encapsulation: ViewEncapsulation.None
})
export class CanvasComponent implements AfterViewInit, OnDestroy {

    @ViewChild('svgCanvas', {static: true}) svgCanvas!: ElementRef

    protected showLogs = injectLocalStorage("showLogs", true)

    protected isDrawing: boolean = false
    protected lassoPath = ''
    private lassoStart: Point = {x: 0, y: 0}
    private selectionPolygon: Array<{ x: number, y: number }> = []

    private resizeObserver!: ResizeObserver
    private physicsInterval: number = -1
    draggingNode: Node | null = null
    width: number = 800
    height: number = 600

    startNode: Node | null = null
    stopNode: Node | null = null
    places: Array<Node> = []
    dfgs: Array<DfgNode> = []
    edges: Array<Edge> = []
    nodes: Array<Node | DfgNode> = []
    transitions: Array<Node> = []

    constructor(protected processGraphService: ProcessGraphService,
                protected toolbarService: ToolbarService,
                protected selectionService: SelectionService) {
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
        if (this.toolbarService.useSpringEmbedder()) {
            PhysicsHelper.calculateRepulsionForce(this.nodes)
            PhysicsHelper.calculateAttractionForce(this.edges)
        }
        PhysicsHelper.updateNodePositions(this.nodes, this.width, this.height, false)
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
                    this.width = entry.contentRect.width
                    this.height = entry.contentRect.height
                }
            }
        })

        this.resizeObserver.observe(svgElement)
    }

    // HANDLING OF MOUSE EVENTS
    onMouseDown(event: MouseEvent) {
        switch (this.toolbarService.selectionType()) {
            case SelectionType.CLICK:
                break
            case SelectionType.LASSO:
                if (this.selectionService.selectedDfg()) {
                    this.lassoSelectionStart(event)
                }
                break
            case SelectionType.NONE:
                break
        }
    }

    onMouseMove(event: MouseEvent) {
        // Always drag in petrinet view
        if (this.selectionService.selectedDfg() === null) {
            this.onDragMove(event)
        }
        switch (this.toolbarService.selectionType()) {
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
        switch (this.toolbarService.selectionType()) {
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
        // Always drag in petrinet view
        if (this.selectionService.selectedDfg() == null) {
            this.onDragStart(node)
        } else {
            switch (this.toolbarService.selectionType()) {
                case SelectionType.CLICK:
                    this.toggleNodeSelected(node)
                    break
                case SelectionType.NONE:
                    this.onDragStart(node)
                    break
            }
        }
    }

    nodeMouseUp() {
        if (this.selectionService.selectedDfg() == null || this.toolbarService.selectionType() === SelectionType.NONE) {
            this.onDragEnd()
        }
    }

    //handling of SELECTIONTYPE.NONE (Dragging)
    onDragStart(node: Node) {
        this.draggingNode = node
        node.isDragged = true
    }

    onDragMove(event: MouseEvent) {
        if (!this.draggingNode) return
        this.draggingNode.x = event.offsetX
        this.draggingNode.y = event.offsetY
    }

    onDragEnd() {
        if (!this.draggingNode) return
        this.draggingNode.isDragged = false
        this.draggingNode = null
    }

    //handling of SELECTIONTYPE.LASSO
    lassoSelectionStart(event: MouseEvent) {
        this.isDrawing = true
        const point = {x: event.offsetX, y: event.offsetY};
        this.selectionPolygon = [point]
        this.lassoStart = point
        this.lassoPath = `M ${event.offsetX} ${event.offsetY}`
    }

    lassoSelectionMove(event: MouseEvent) {
        event.preventDefault()
        if (!this.isDrawing) return

        const newPoint = {x: event.offsetX, y: event.offsetY}
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
        if (node.type !== NodeType.node || node.name === 'play' || node.name === 'stop') return //only allow adding nodes (not dfg or places)
        this.selectionService.toggleNodeSelected(node)
    }

    dfgClicked(dfg: DfgNode) {
        this.selectionService.selectDfg(dfg)
    }

    initGraph(graph: ProcessGraph | null) {
        if (!graph) return

        this.dfgs = [...graph.dfgSet]
        this.nodes.push(...this.dfgs)
        this.places = [...graph.places]
        this.nodes.push(...this.places)
        this.transitions =[...graph.transitions]
        this.nodes.push(...this.transitions)

        for (const arc of graph.arcs) {
            //look up source & target
            const sourceNode = this.findNode((arc.source as Node).name)
            const targetNode =  this.findNode((arc.target as Node).name)
            if (!sourceNode || !targetNode) return console.log("Didnt find source or target for Arc: ", arc)
            this.edges.push({source: sourceNode, target: targetNode, bidirectional: false})
        }

        //Replace Tau Node Names
        for (let node of this.nodes) {
            if (node.name.startsWith("TAU_")) {
                node.name = "τ"
            }
        }

    }

    private findNode(name: string): Node | DfgNode | null {
        const index = this.nodes.findIndex(node => node.name === name)
        if (index !== -1) return this.nodes[index]

        return null
    }

    private getNode(name: string, type: NodeType): Node {
        return {
            name: name,
            x: (this.width / 2) * Math.random(),
            y: (this.height / 2) * Math.random(),
            vx: 0,
            vy: 0,
            isDragged: false,
            isSelected: false,
            height: PhysicsHelper.nodeDiameter,
            width: PhysicsHelper.nodeDiameter,
            type: type
        }
    }

    reset(): void {
        this.dfgs = []
        this.places = []
        this.edges = []
        this.nodes = []
        this.transitions = []
    }
}
