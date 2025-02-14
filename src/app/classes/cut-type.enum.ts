/**
 * Enum representing the different types of cuts that can be applied in the context of a Directed Flow Graph (DFG).
 * Each type corresponds to a specific way of splitting or analyzing the flow of nodes in the graph.
 *
 * @enum {string}
 * @readonly
 */
export enum CutType {
    /**
     * Represents an XOR (exclusive or) cut
     */
    XOR = "XOR",

    /**
     * Represents a sequence cut
     */
    SEQUENCE = "Sequence",

    /**
     * Represents a parallel cut
     */
    PARALLEL = "Parallel",

    /**
     * Represents a loop cut
     */
    LOOP = "Loop"
}
