// src/app/services/validation.service.ts
import {Injectable} from '@angular/core';
import {DirectlyFollows} from '../classes/directlyFollows';
import { ValidationDataService } from './validationData.service';
import { ResultService } from './result.service';

@Injectable({
    providedIn: 'root'
})


export class ValidationService {

    constructor(
        private validationDataService: ValidationDataService,
        private resultService: ResultService
    ) {
        this.validationDataService.data$.subscribe(data => {
            if (data) {
                const result = this.validateAndReturn(data.dfg, data.knotenMengeA, data.knotenMengeB, data.cut);
                this.resultService.updateResult(result);
            }
        })
    }


    //TODO: muss noch verknüpfung der DFG Rückgeben
    validateAndReturn(dfg: DirectlyFollows,
    knotenMengeA: Set<string>,
    knotenMengeB: Set<string>,
    cut: string) : [boolean, string | null , DirectlyFollows?, DirectlyFollows?]{
        const validationsErgebnis : [boolean, string | null] = this.validator(dfg, knotenMengeA, knotenMengeB, cut);
        if (!validationsErgebnis[0]){
            return validationsErgebnis;
        } else{
        let dfg1 :  DirectlyFollows = this.kreiereNeuenDFG(dfg,knotenMengeA);
        let dfg2 : DirectlyFollows = this.kreiereNeuenDFG(dfg,knotenMengeB);
        return [true, cut, dfg1,dfg2]
        }
    }


    private kreiereNeuenDFG(dfg: DirectlyFollows, knotenmengeA: Set<string>): DirectlyFollows {
        let rueckDFG :  DirectlyFollows = new DirectlyFollows()
        let tempStringset : Set<string> = new Set();
        knotenmengeA.add("play");
        knotenmengeA.add("stop");
        for ( const [ursprung, nachfolgerSet] of dfg.folgeMap) {
            if (knotenmengeA.has(ursprung)){
                for (let folger of nachfolgerSet){
                    if(knotenmengeA.has(folger)){
                        rueckDFG.addNachFolger(ursprung,folger);
                    } else {
                        rueckDFG.addNachFolger(ursprung,"stop");
                    }
                }
            }
            if (!knotenmengeA.has(ursprung)){
                for(let folger of nachfolgerSet){
                    if(knotenmengeA.has(folger)){
                        tempStringset.add(folger);
                    }
                }
            }
        }
        for (const element of tempStringset){
            rueckDFG.addNachFolger("play", element);
        }
        rueckDFG.erstelleVorgaengerMap();
        return rueckDFG;
    }


    //Nimmt als eingabe einen DFG, 2 Knotenmengen sowie die Cutmethode als string, prüft den cut und gibt true, bzw false mit einem String als Begründung aus
    private validator (dfg: DirectlyFollows,
                      knotenmengeA: Set<string>,
                      knotenMengeB: Set<string>,
                      cut: string) : [boolean, string | null] {
        if (this.allNodesUsedValidation(dfg, knotenmengeA, knotenMengeB)){
            switch(cut) {
                case "xor": {
                    return this.xorValidation(dfg, knotenmengeA, knotenMengeB);
                }
                case "parallel": {
                    break;
                }
                case "sequence": {
                    break;
                }
                case "loop": {
                    break
                }
                default: {
                    break;
                }
            }
            return [false, "anderer Fehler"]
        } else {
            return [false, "Es müssen alle Knoten in den Mengen vorkommen und sie müssen exklusiv sein"]
        }

    }

    private allNodesUsedValidation(dfg: DirectlyFollows, knotenmengeA: Set<string>, knotenMengeB: Set<string>): boolean {
        //Prüfe, ob Schnittmenge leer
        let schnitt = new Set<string>([...knotenmengeA].filter(element=>knotenMengeB.has(element)));
        if (schnitt.size !== 0) {
            console.log("Schnitt nicht leer");
            return false;
        }
        // Prüfe ob Vereinigung alle Schlüssel der Map enthält
        let vereinigung = new Set<string>([...knotenmengeA,...knotenMengeB]);
        vereinigung.add("play");
        vereinigung.add("stop");
        for (let knoten of dfg.getKnoten()) {
            if(!vereinigung.has(knoten)) {
                console.log("Knoten fehlt");
                return false; //Schlüssel nicht in Knotenmenge Vorhanden
            }
        }
        return true;
    }
    private xorValidation (dfg: DirectlyFollows, knotenMengeA:Set<string>, knotenMengeB:Set<string>): [boolean, string | null] {
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
