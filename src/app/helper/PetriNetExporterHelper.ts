import {JsonPetriNet} from "../classes/json-petri-net";
import {ProcessGraph} from "../classes/process-graph";
import {CanvasComponent} from "../components/graph/canvas.component";
import {Node} from "../classes/graph/node";
import {DfgNode} from "../classes/graph/dfg-node";

export class PetrinetExporterHelper {

    // Function to generate a JSON as String from a Petri-Net
    public generateJsonString(processGraph: ProcessGraph, canvasComponent: CanvasComponent): string | null {
        if (processGraph.dfgSet.size > 0) {
            console.error("The object is not a valid Petri net.");
            return null;
        }

        let jsonPetriNet: JsonPetriNet = {
            places: Array.from(processGraph.places).map(place => place.id),
            transitions: Array.from(processGraph.transitions).map(transition => transition.id),
            arcs: {},
            labels: {},
            layout: {}
        };

        // Add coordinates for places
        processGraph.places.forEach(place => {
            const foundNode = this.findNodeFromCanvasComponent(canvasComponent, place.id);
            if (!foundNode) {
                console.error(`Node with id ${place.id} not found on the canvas.`);
                jsonPetriNet.layout![place.id] = { x: 0, y: 0 }; // Default position if not found
            } else {
                jsonPetriNet.layout![place.id] = { x: foundNode.x, y: foundNode.y };
            }
        });

        // Add coordinates for transitions
        processGraph.transitions.forEach(transition => {
            const foundNode = this.findNodeFromCanvasComponent(canvasComponent, transition.id);
            if (!foundNode) {
                console.error(`Transition with id ${transition.id} not found on the canvas.`);
                jsonPetriNet.layout![transition.id] = { x: 0, y: 0 }; // Default position if not found
            } else {
                jsonPetriNet.layout![transition.id] = { x: foundNode.x, y: foundNode.y };
            }
        });

        // Populate arcs
        processGraph.arcs.forEach(arc => {
            const sourceId = typeof arc.source === "string" ? arc.source : arc.source.id;
            const targetId = typeof arc.target === "string" ? arc.target : arc.target.id;

            if (sourceId && targetId && jsonPetriNet.arcs) {
                const idPair = `${sourceId}->${targetId}`;
                jsonPetriNet.arcs[idPair] = 1; // Add the arc
            } else {
                console.error("Invalid arc source or target:", arc);
            }
        });

        // Populate labels for transitions
        processGraph.transitions.forEach(transition => {
            if (transition.id && jsonPetriNet.labels) {
                jsonPetriNet.labels[transition.id] = transition.id;
            }
        });

        return JSON.stringify(jsonPetriNet, null, 2);
    }

    // Function to generate PNML as String from a Petri-Net
    public generatePnmlString(processGraph: ProcessGraph, canvasComponent: CanvasComponent): string | null {
        if (processGraph.dfgSet.size > 0) {
            console.error("The object is not a valid Petri net.");
            return null;
        }

        let pnml = `<?xml version="1.0" encoding="UTF-8"?>\n<pnml>\n  <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnml">\n`;

        // Add places with coordinates
        processGraph.places.forEach(place => {
            const foundNode = this.findNodeFromCanvasComponent(canvasComponent, place.id);
            const x = foundNode ? foundNode.x : 0;
            const y = foundNode ? foundNode.y : 0;

            pnml += `    <place id="${place.id}">\n`;
            pnml += `      <graphics>\n        <position x="${x}" y="${y}" />\n      </graphics>\n`;
            pnml += `    </place>\n`;
        });

        // Add transitions with coordinates and labels
        processGraph.transitions.forEach(transition => {
            const foundNode = this.findNodeFromCanvasComponent(canvasComponent, transition.id);
            const x = foundNode ? foundNode.x : 0;
            const y = foundNode ? foundNode.y : 0;

            pnml += `    <transition id="${transition.id}">\n`;
            pnml += `      <name>\n        <text>${transition.id}</text>\n      </name>\n`; // Label only for transitions
            pnml += `      <graphics>\n        <position x="${x}" y="${y}" />\n      </graphics>\n`;
            pnml += `    </transition>\n`;
        });

        // Add arcs
        processGraph.arcs.forEach(arc => {
            const sourceId = typeof arc.source === "string" ? arc.source : arc.source.id;
            const targetId = typeof arc.target === "string" ? arc.target : arc.target.id;

            pnml += `    <arc id="${sourceId}_${targetId}" source="${sourceId}" target="${targetId}">\n`;
            pnml += `    </arc>\n`;
        });

        pnml += `  </net>\n</pnml>`;
        return pnml;
    }

    generateFileName(extension: 'json' | 'pnml'): string {
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '_');
        return `petri_net_${timestamp}.${extension}`;
    }

    findNodeFromCanvasComponent(canvasComponent: CanvasComponent, name: string): Node | DfgNode | null {
        const index = canvasComponent.nodes.findIndex(node => node.name === name)
        if (index !== -1) return canvasComponent.nodes[index]

        return null
    }

}

