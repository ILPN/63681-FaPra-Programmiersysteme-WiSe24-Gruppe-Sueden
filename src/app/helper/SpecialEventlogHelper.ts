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

        let isPatternRepeatedInATrace = false;
        let pattern = shortestNotEmptyTrace(eventlog);
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
