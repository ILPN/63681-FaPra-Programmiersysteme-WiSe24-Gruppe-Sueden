import {DirectlyFollows} from "../classes/directly-follows";

export class SpecialEventlogHelper {

    public static isPatternExclusivelyRepeated(eventlog: string[][]): boolean {
        // Helper function which returns shortest but not empty trace, as candidate of pattern
        function shortestNotEmptyTrace(eventlog: string[][]): string[] {
            let shortestTrace: string[] = [];
            let minLength = Infinity;

            for (const row of eventlog) {
                // Skip empty rows
                if (row.length > 0 && row.length < minLength) {
                    minLength = row.length;
                    shortestTrace = row;
                }
            }
            return shortestTrace;
        }

        function findRepeatedPattern(row: string[]): string[] {
            const n = row.length;

            for (let patternLength = 1; patternLength <= Math.floor(n / 2); patternLength++) {
                if (n % patternLength !== 0) continue; // Skip if the array length is not divisible by the pattern length

                const pattern = row.slice(0, patternLength);
                let isRepeated = true;

                // Check if the entire array is composed of this pattern
                for (let i = 0; i < n; i++) {
                    if (row[i] !== pattern[i % patternLength]) {
                        isRepeated = false;
                        break;
                    }
                }

                if (isRepeated) {
                    return pattern;
                }
            }

            return row; // If no smaller repeating pattern is found, return the array itself
        }

        let isPatternRepeatedInATrace = false;
        let pattern = findRepeatedPattern(shortestNotEmptyTrace(eventlog));
        if (pattern.length === 0) {
            return false; // eventlog has only empty traces
        }

        // Helper function to check if a row matches the pattern
        function isRowValid(row: string[], pattern: string[]): boolean {
            const patternLength = pattern.length;
            const rowLength = row.length;

            // Row length must be a multiple of the pattern length
            if (rowLength % patternLength !== 0) {
                return false;
            }

            // Check each segment in the row
            for (let i = 0; i < rowLength; i += patternLength) {
                for (let j = 0; j < patternLength; j++) {
                    if (row[i + j] !== pattern[j]) {
                        return false;
                    }
                }
            }
            return true;
        }

        const hasPatternMultipleTimes = (row: string[], pattern: string[]): boolean => {
            let count = 0, len = pattern.length;
            for (let i = 0; i <= row.length - len; i++) {
                if (row.slice(i, i + len).every((v, j) => v === pattern[j])) {
                    count++;
                    i += len - 1; // Skip to the end of the match
                }
            }
            return count > 1;
        };

        // Check each row in the eventlog
        for (const row of eventlog) {
            if (!isRowValid(row, pattern)) {
                return false;
            } else {
                if (hasPatternMultipleTimes(row, pattern)) {
                    isPatternRepeatedInATrace ||= true;
                }
            }
        }

        return true && isPatternRepeatedInATrace;
    }

}
