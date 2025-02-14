/**
 * Interface representing the result of a validation check. It provides information on whether the validation
 * was successful, along with additional comments and the reason for the result.
 *
 * @interface
 */
export interface ValidationResult {
    /**
     * Indicates whether the validation was successful.
     *
     * @type {boolean}
     */
    success: boolean;

    /**
     * a comment which cut was / was not successful
     *
     * @type {string}
     */
    title: string;

    /**
     * The reason, why the validation was successful or failed
     *
     * @type {string}
     */
    reason: string;
}
