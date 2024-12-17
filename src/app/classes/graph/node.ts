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

export enum NodeType {
    node,
    place,
    eventLog,
    transition
}
