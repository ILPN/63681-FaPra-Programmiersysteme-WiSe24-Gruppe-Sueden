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
            {source: 'play', target: 'A'},
            {source: 'play', target: 'E'},
            {source: 'A', target: 'B'},
            {source: 'A', target: 'D'},
            {source: 'B', target: 'C'},
            {source: 'D', target: 'C'},
            {source: 'C', target: 'stop'},
            {source: 'E', target: 'F'},
            {source: 'F', target: 'G'},
            {source: 'G', target: 'stop'},
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

    it('should return true when there is a path from nodeset1 to nodeset2 with existsPath()', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['E', 'F', 'G', 'H'],
            ['E', 'I', 'J', 'H'],
        ];

        directlyFollows.setDFGfromStringArray(inputStringArray);

        expect(directlyFollows.existsPath(new Set(['play']), new Set(['C']), new Set(['play', 'A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsPath(new Set(['A']), new Set(['B']), new Set(['A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsPath(new Set(['B']), new Set(['D']), new Set(['A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsPath(new Set(['B']), new Set(['C', 'D']), new Set(['A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsPath(new Set(['B']), new Set(['A', 'D']), new Set(['A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsPath(new Set(['A']), new Set(['C']), new Set(['C', 'D']))).toBeFalse();
        expect(directlyFollows.existsPath(new Set(['B']), new Set(['D']), new Set(['A', 'B']))).toBeFalse();
        expect(directlyFollows.existsPath(new Set(['F']), new Set(['J']), new Set(['E', 'F', 'G', 'H', 'I', 'J']))).toBeFalse();
        expect(directlyFollows.existsPath(new Set(['E']), new Set(['H']), new Set(['A', 'B', 'C', 'D']))).toBeFalse();

    });

    it('should return true when there is a full path from play to stop via a node using existsFullPathOverNode()', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['E', 'F', 'G', 'H'],
            ['E', 'I', 'J', 'H'],
            ['K'],
            ['L', 'M']
        ];

        directlyFollows.setDFGfromStringArray(inputStringArray);

        // Voraussetzen, dass allowedNodes immer node enthält
        expect(directlyFollows.existsFullPathOverNode('A', new Set(['A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('B', new Set(['A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('G', new Set(['E', 'F', 'G', 'H', 'I', 'J']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('K', new Set(['K']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('L', new Set(['L', 'M']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('F', new Set(['A', 'B', 'C', 'D', 'F']))).toBeFalse();
        expect(directlyFollows.existsFullPathOverNode('B', new Set(['A', 'B', 'C']))).toBeFalse();
        expect(directlyFollows.existsFullPathOverNode('B', new Set(['B', 'E', 'F', 'G', 'H']))).toBeFalse();

        // Testen mit 'play' und 'stop' als node und als Element von allowedNodes
        expect(directlyFollows.existsFullPathOverNode('play', new Set(['play', 'A', 'B', 'C', 'D', 'stop']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('C', new Set(['play', 'A', 'B', 'C', 'D', 'stop']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('C', new Set(['play', 'A', 'B', 'C', 'D']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('C', new Set(['A', 'B', 'C', 'D', 'stop']))).toBeTrue();
        expect(directlyFollows.existsFullPathOverNode('stop', new Set(['play', 'A', 'B', 'C', 'D', 'stop']))).toBeTrue();
        // das Fehlen von 'stop' in allwedNodes scheint keine Auswirkung auf das Ergebnis zu haben, das Fehlen von 'play' jedoch schon
    });

    it('should return nodes without play and stop using getNodes()', () => {
        const inputStringArray: string[][] = [
            ['A', 'B', 'C', 'D'],
            ['E', 'F', 'G', 'H'],
            ['E', 'I', 'J', 'H'],
            ['K'],
            ['L', 'M']
        ];

        directlyFollows.setDFGfromStringArray(inputStringArray);

        expect(directlyFollows.getNodes()).not.toContain('play');
        expect(directlyFollows.getNodes()).toContain('A');
        expect(directlyFollows.getNodes()).toContain('B');
        expect(directlyFollows.getNodes()).toContain('C');
        expect(directlyFollows.getNodes()).toContain('D');
        expect(directlyFollows.getNodes()).toContain('E');
        expect(directlyFollows.getNodes()).toContain('F');
        expect(directlyFollows.getNodes()).toContain('G');
        expect(directlyFollows.getNodes()).toContain('H');
        expect(directlyFollows.getNodes()).toContain('I');
        expect(directlyFollows.getNodes()).toContain('J');
        expect(directlyFollows.getNodes()).not.toContain('stop');
    });
});
