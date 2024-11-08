import {DirectlyFollows} from './directly-follows';
import {Arc} from './arc';

describe('DirectlyFollows', () => {
    let directlyFollows: DirectlyFollows;

    beforeEach(() => {
        directlyFollows = new DirectlyFollows();
    });

    it('should correctly initialize everything using setDFGfromStringArray()', () => {
        // Beispiel-Event-Log, das den Prozessfluss darstellt
        const inputStringArray: string[][] = [
            ['A', 'B', 'C'],
            ['A', 'D', 'C'],
            ['E', 'F', 'G'],

        ];

        // Methode aufrufen
        directlyFollows.setDFGfromStringArray(inputStringArray);

        // Erwartungen für successorMap
        expect(directlyFollows.successorMap.get('play')?.has('A')).toBeTrue();
        expect(directlyFollows.successorMap.get('A')?.has('B')).toBeTrue();
        expect(directlyFollows.successorMap.get('A')?.has('D')).toBeTrue();
        expect(directlyFollows.successorMap.get('B')?.has('C')).toBeTrue();
        expect(directlyFollows.successorMap.get('D')?.has('C')).toBeTrue();
        expect(directlyFollows.successorMap.get('C')?.has('stop')).toBeTrue();

        // Erwartungen für predecessorMap
        expect(directlyFollows.predecessorMap.get('A')?.has('play')).toBeTrue();
        expect(directlyFollows.predecessorMap.get('B')?.has('A')).toBeTrue();
        expect(directlyFollows.predecessorMap.get('D')?.has('A')).toBeTrue();
        expect(directlyFollows.predecessorMap.get('C')?.has('B')).toBeTrue();
        expect(directlyFollows.predecessorMap.get('C')?.has('D')).toBeTrue();
        expect(directlyFollows.predecessorMap.get('stop')?.has('C')).toBeTrue();

        // Erwartungen für nodes
        expect(directlyFollows.nodes.has('A')).toBeTrue();
        expect(directlyFollows.nodes.has('B')).toBeTrue();
        expect(directlyFollows.nodes.has('C')).toBeTrue();
        expect(directlyFollows.nodes.has('D')).toBeTrue();
        expect(directlyFollows.nodes.has('play')).toBeFalse();
        expect(directlyFollows.nodes.has('stop')).toBeFalse();

        // Erwartungen für arcs

        const expectedArcs: Arc[] = [
            { source: 'play', target: 'A' },
            { source: 'play', target: 'E' },
            { source: 'A', target: 'B' },
            { source: 'A', target: 'D' },
            { source: 'B', target: 'C' },
            { source: 'D', target: 'C' },
            { source: 'C', target: 'stop' },
            { source: 'E', target: 'F' },
            { source: 'F', target: 'G' },
            { source: 'G', target: 'stop' },
        ];
        const arcs = directlyFollows.getArcs();

        // Vergleiche falls Source Target Strings sind
        const compareStrings = (a: any, b: any) => {
            if (typeof a === 'string' && typeof b === 'string') {
                return a.localeCompare(b);
            }
            return 0; // ignoriere falls nicht string (im fall dfg, hier nicht notwendig...)
        };

        // Sortiere beide Arrays nach source und target
        const sortArcs = (arr: Arc[]) =>
            arr.sort((a, b) => {
                const sourceComparison = compareStrings(a.source, b.source);
                if (sourceComparison !== 0) return sourceComparison;
                return compareStrings(a.target, b.target);
            });

        const sortedArcs = sortArcs(arcs);
        const sortedExpectedArcs = sortArcs(expectedArcs);

        // Vergleiche die sortierten Arrays
        expect(sortedArcs).toEqual(sortedExpectedArcs);


        expect(directlyFollows.getArcs().length).toBe(10);
    });
});
