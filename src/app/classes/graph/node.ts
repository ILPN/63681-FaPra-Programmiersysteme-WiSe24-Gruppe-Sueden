export interface Node {
    id: number;
    x: number;
    y: number;
    vx: number;  // Velocity x
    vy: number;  // Velocity y
    isDragged: boolean;  // Is the node being dragged
}
