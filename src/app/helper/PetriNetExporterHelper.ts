import {JsonPetriNet} from "../classes/json-petri-net";
import {ProcessGraph} from "../classes/process-graph";

export class PetrinetExporterHelper {

    // Function to generate a JSON as String from a Petri-Net
    public static generateJsonString(processGraph: ProcessGraph): string | null {
        if (processGraph.dfgSet.size > 0) {
            console.error("The object is not a valid Petri net.");
            return null;
        }

        let jsonPetriNet: JsonPetriNet = {
            places: Array.from(processGraph.places).map(place => place.name),
            transitions: Array.from(processGraph.transitions).map(transition => transition.name),
            arcs: {},
            actions: [],
            labels: {},
            layout: {},
            marking: {}
        };

        // Add coordinates for places
        processGraph.places.forEach(place => {
            jsonPetriNet.layout![place.name] = { x: Math.round(place.x), y: Math.round(place.y) };
            jsonPetriNet.marking![place.name] = 0;
        });

        // Add coordinates for transitions
        processGraph.transitions.forEach(transition => {
            if (!transition.name.startsWith('TAU_')) {
                jsonPetriNet.actions!.push(transition.name);
            }
            jsonPetriNet.layout![transition.name] = { x: Math.round(transition.x), y: Math.round(transition.y) }
        });

        // Populate arcs and set positions
        processGraph.arcs.forEach(arc => {
            const sourceName = typeof arc.source === "string" ? arc.source : arc.source.name;
            const targetName = typeof arc.target === "string" ? arc.target : arc.target.name;

            if (sourceName && targetName && jsonPetriNet.arcs) {

                const idPair = `${sourceName}, ${targetName}`;
                jsonPetriNet.arcs[idPair] = 1; // Add the arc

                // Find the source and target by name in the places or transitions arrays
                const source = [...processGraph.places, ...processGraph.transitions].find((node: any) => node.name === sourceName);
                const target = [...processGraph.places, ...processGraph.transitions].find((node: any) => node.name === targetName);

                // Ensure that both source and target are valid objects
                if (source && target) {
                    // Calculate the midpoint between the source and target coordinates
                    const arcPos = {
                        x: Math.round(target.x),
                        y: Math.round(target.y)
                    };
                    /*
                    const arcPos = {
                        x: (source.x + target.x) / 2,
                        y: (source.y + target.y) / 2
                    };
                    */

                    // Add arc to the arcs object
                    jsonPetriNet.arcs![`${sourceName}, ${targetName}`] = 1;

                    // Add arc position to layout (using midpoint)
                    jsonPetriNet.layout![`${sourceName}, ${targetName}`] = arcPos;
                } else {
                    console.error(`Invalid source or target for arc: ${sourceName} -> ${targetName}`);
                }
            } else {
                console.error("Invalid arc source or target name:", sourceName, targetName);
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
    public static generatePnmlString(processGraph: ProcessGraph): string | null {
        if (processGraph.dfgSet.size > 0) {
            console.error("The object is not a valid Petri net.");
            return null;
        }

        let pnml = `<?xml version="1.0" encoding="UTF-8"?>\n<pnml>\n  <net>\n`;
        // let pnml = `<?xml version="1.0" encoding="UTF-8"?>\n<pnml>\n  <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnml">\n`;

        // Add places with coordinates, initial marking, and name (empty string)
        processGraph.places.forEach(place => {
            const x = Math.round(place.x);
            const y = Math.round(place.y);

            pnml += `    <place id="${place.name}">\n`;
            // Add place name with empty text
            pnml += `      <name>\n        <text></text>\n      </name>\n`;
            pnml += `      <initialMarking>\n        <text>0</text>\n      </initialMarking>\n`;
            pnml += `      <graphics>\n        <position x="${x}" y="${y}" />\n      </graphics>\n`;
            pnml += `    </place>\n`;
        });

        // Add transitions with coordinates and labels
        processGraph.transitions.forEach(transition => {
            const x = Math.round(transition.x);
            const y = Math.round(transition.y);

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

            pnml += `    <arc id="${sourceId}_${targetId}" source="${sourceId}" target="${targetId}"/>\n`;
            //pnml += `    </arc>\n`;
        });

        pnml += `  </net>\n</pnml>`;
        return pnml;
    }

}

