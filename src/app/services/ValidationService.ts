// src/app/services/ValidationService.ts
import {DirectlyFollows} from '../classes/DirectlyFollows';
import { RueckgabeDFGs } from '../classes/RueckgabeDFGs';

export class ValidationService {

    static allNodesUsedValidation(dfg: DirectlyFollows, knotenmengeA: Set<string>, knotenMengeB: Set<string>): boolean {
        //Prüfe, ob Schnittmenge leer
        let schnitt = new Set<string>([...knotenmengeA].filter(element=>knotenMengeB.has(element)));
        if (schnitt.size !== 0) {
            console.log("Schnitt nicht leer");
            return false;
        }
        // Prüfe ob Vereinigung alle Schlüssel der Map enthält
        let vereinigung = new Set<string>([...knotenmengeA,...knotenMengeB]);
        for (let knoten of dfg.getKnoten()) {
            if(!vereinigung.has(knoten)) {
                return false; //Schlüssel nicht in Knotenmenge Vorhanden
            }
        }
        return true;
    }
    static xorValidation (dfg: DirectlyFollows, knotenMengeA:Set<string>, knotenMengeB:Set<string>): [boolean, string | null] {
        //Prüfe, ob keine Kanten von Knotenmenge 1 nach Knotenmenge 2
        for (let aKnoten of knotenMengeA) {
            let aFolgeKnotenMenge = dfg.getNachfolger(aKnoten);
            if (aFolgeKnotenMenge){
                for (let aFolgeKnoten of aFolgeKnotenMenge){
                    if (knotenMengeB.has(aFolgeKnoten)){
                        return [false ,  `Kante von ${aKnoten} nach ${aFolgeKnoten} gefunden`];
                    }
                }
            }
        }
        //Prüfe, ob keine Kanten von Knotenmenge 2 nach Knotenmenge 1
        for (let bKnoten of knotenMengeB) {
            let bFolgeKnotenMenge = dfg.getNachfolger(bKnoten);
            if (bFolgeKnotenMenge){
                for (let bFolgeKnoten of bFolgeKnotenMenge){
                    if (knotenMengeA.has(bFolgeKnoten)){
                        return [false ,`Kante von ${bKnoten} nach ${bFolgeKnoten} gefunden`];
                    }
                }
            }
        }
        return [true, null];
    }



}
