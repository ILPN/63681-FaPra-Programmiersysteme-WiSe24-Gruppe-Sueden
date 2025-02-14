/**
 * Represents a Node in a graph. A node contains information about its position, state, and type.
 * Nodes can be dragged, selected, and have various properties that define their appearance and behavior.
 *
 * @interface Node
 *
 * @property {string} name - The name or identifier of the node.
 * @property {number} x - The x-coordinate of the node's position.
 * @property {number} y - The y-coordinate of the node's position.
 * @property {number} vx - The velocity of the node along the x-axis (for dynamic nodes).
 * @property {number} vy - The velocity of the node along the y-axis (for dynamic nodes).
 * @property {boolean} isDragged - Indicates whether the node is currently being dragged.
 * @property {boolean} isSelected - Indicates whether the node is currently selected.
 * @property {NodeType} type - The type of the node (e.g., node, place, event log, or transition).
 * @property {number} height - The height of the node (for visual representation).
 * @property {number} width - The width of the node (for visual representation).
 */
export interface Node {
    name: string
    x: number
    y: number
    vx: number
    vy: number
    isDragged: boolean
    isSelected: boolean
    type: NodeType
    height: number
    width: number
}

/**
 * Enum for the different types of nodes in a graph.
 *
 * @enum {number}
 * @readonly
 * @property {number} node - A generic node type used for nodes in a Directed Flow Graph (DFG). These nodes are parsed from a Set<string> from a DirectlyFollows Object during runtime.
 * @property {number} place - Represents a "place" in the PetriNet
 * @property {number} eventLog - Represents a node used for event logs.
 * @property {number} transition - Represents a transition node in the PetriNet
 */
export enum NodeType {
    node,
    place,
    eventLog,
    transition
}
