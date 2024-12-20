import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {FallthroughHelper} from '../helper/FallthroughHelper';
import {DirectlyFollows} from '../classes/directly-follows';
import {SpecialEventlogHelper} from "./SpecialEventlogHelper";

describe('SpecialEventlogHelper Test', () => {

    beforeEach(() => {
    });

    describe('isPatternExclusivelyRepeated', () => {

        it('should return true for matched exclusively repeating pattern and eventlog, case 1', fakeAsync(() => {
            const eventlog = [
                ['A', 'B'],
                [ ],
                ['A', 'B', 'A', 'B', 'A', 'B']
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(true);
        }));

        it('should return true for matched exclusively repeating pattern and eventlog, case 2', fakeAsync(() => {
            const eventlog = [
                ['A'],
                ['A', 'A', 'A', 'A'],
                [ ],
                ['A', 'A']
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(true);
        }));

        it('should return true for matched exclusively repeating pattern and eventlog, case 3', fakeAsync(() => {
            const eventlog = [
                ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'],
                ['A', 'B', 'C', 'D'],
                ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'],
                [ ]
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(true);
        }));

        it('should return false for not matched exclusively repeating pattern and eventlog, case 1', fakeAsync(() => {
            const eventlog = [
                ['A'],
                ['A', 'A'],
                ['A', 'B', 'A', 'A'],
                [ ]
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(false);
        }));

        it('should return false for not matched exclusively repeating pattern and eventlog, case 2', fakeAsync(() => {
            const eventlog = [
                ['A', 'B', 'A', 'B'],
                ['A', 'B'],
                ['B', 'A', 'B', 'A', 'B', 'A']
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(false);
        }));

        it('should return false for not matched exclusively repeating pattern and eventlog, case 2', fakeAsync(() => {
            const eventlog = [
                ['A', 'B', 'A', 'B'],
                ['A', 'B'],
                ['B', 'A', 'B', 'A', 'B', 'A']
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(false);
        }));

        it('should return false for not matched exclusively repeating pattern and eventlog, case 3', fakeAsync(() => {
            const eventlog = [
                [ ],
                [ ],
                [ ]
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(false);
        }));

        it('should return false for not matched exclusively repeating pattern and eventlog, case 4', fakeAsync(() => {
            const eventlog = [
                [ ],
                ['A', 'B'],
                [ ],
                ['A', 'B'],
                ['A', 'B']
            ];

            const result = SpecialEventlogHelper.isPatternExclusivelyRepeated(eventlog)
            expect(result).toBe(false); // There is no trace with repeat of pattern
        }));
    });

});
