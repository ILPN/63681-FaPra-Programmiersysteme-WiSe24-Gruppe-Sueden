import {JsonPetriNet} from "../classes/json-petri-net";
import {ProcessGraph} from "../classes/process-graph";

export class PetrinetExporterHelper {

    // Function to generate a JSON as String from a Petri-Net
    public generateJsonString(processGraph: ProcessGraph): string | null {
        if (processGraph.dfgSet.size > 0) {
            console.error("The object is not a valid Petri net.");
            return null;
        }

        let jsonPetriNet: JsonPetriNet = {
            places: Array.from(processGraph.places).map(place => place.name),
            transitions: Array.from(processGraph.transitions).map(transition => transition.name),
            arcs: {},
            labels: {},
            layout: {}
        };

        // Add coordinates for places
        processGraph.places.forEach(place => {
                jsonPetriNet.layout![place.name] = { x: place.x, y: place.y };
        });

        // Add coordinates for transitions
        processGraph.transitions.forEach(transition => {
            jsonPetriNet.layout![transition.name] = { x: transition.x, y: transition.y }
        });

        // Populate arcs
        processGraph.arcs.forEach(arc => {
            const sourceName = typeof arc.source === "string" ? arc.source : arc.source.name;
            const targetName = typeof arc.target === "string" ? arc.target : arc.target.name;

            if (sourceName && targetName && jsonPetriNet.arcs) {
                const idPair = `${sourceName}->${targetName}`;
                jsonPetriNet.arcs[idPair] = 1; // Add the arc
            } else {
                console.error("Invalid arc source or target:", arc);
            }
        });

        // Populate labels for transitions
        processGraph.transitions.forEach(transition => {
            if (transition.name && jsonPetriNet.labels) {
                // Check whether the name starts with 'TAU_'
                if (transition.name.startsWith('TAU_')) {
                    // If it starts with 'TAU_', assign the label 'τ'
                    jsonPetriNet.labels[transition.name] = 'τ';
                } else {
                    jsonPetriNet.labels[transition.name] = transition.name;
                }
            }
        });

        return JSON.stringify(jsonPetriNet, null, 2);
    }

    // Function to generate PNML as String from a Petri-Net
    public generatePnmlString(processGraph: ProcessGraph): string | null {
        if (processGraph.dfgSet.size > 0) {
            console.error("The object is not a valid Petri net.");
            return null;
        }

        let pnml = `<?xml version="1.0" encoding="UTF-8"?>\n<pnml>\n  <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnml">\n`;

        // Add places with coordinates
        processGraph.places.forEach(place => {
            const x = place.x;
            const y = place.y;

            pnml += `    <place id="${place.name}">\n`;
            pnml += `      <graphics>\n        <position x="${x}" y="${y}" />\n      </graphics>\n`;
            pnml += `    </place>\n`;
        });

        // Add transitions with coordinates and labels
        processGraph.transitions.forEach(transition => {
            const x = transition.x;
            const y = transition.y;

            // Determine the label: 'τ' if name starts with 'TAU_', otherwise use the original name
            const label = transition.name.startsWith('TAU_') ? 'τ' : transition.name;

            pnml += `    <transition id="${transition.name}">\n`;
            pnml += `      <name>\n        <text>${label}</text>\n      </name>\n`;
            pnml += `      <graphics>\n        <position x="${x}" y="${y}" />\n      </graphics>\n`;
            pnml += `    </transition>\n`;
        });

        // Add arcs
        processGraph.arcs.forEach(arc => {
            const sourceId = typeof arc.source === "string" ? arc.source : arc.source.name;
            const targetId = typeof arc.target === "string" ? arc.target : arc.target.name;

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

}

