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

        // Check each row in the eventlog
        for (const row of eventlog) {
            if (!isRowValid(row, pattern)) {
                return false;
            }
        }


        return true;
    }

}
