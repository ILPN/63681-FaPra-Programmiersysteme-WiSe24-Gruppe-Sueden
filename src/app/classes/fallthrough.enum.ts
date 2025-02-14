/**
 * Enum representing the different types of fallthrough-strategies used
 *
 * @enum {string}
 * @readonly
 */
export enum FallthroughType {
    /**
     * Represents the "Tau-Loop" fallthrough-strategy
     */
    SPT = "solvePerTau",

    /**
     * Represents the "Activity Once Per Trace" fallthrough-strategy
     */
    AOPT = "activityOncePerTrace",

    /**
     * Represents the "Flower" fallthrough-strategy
     */
    FLOWER = "flower",
}
