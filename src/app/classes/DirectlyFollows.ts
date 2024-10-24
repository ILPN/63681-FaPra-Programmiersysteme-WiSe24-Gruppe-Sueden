export class DirectlyFollows {
    folgeMap: 		Map<string, Set<string>>;
    vorgaengerMap: 	Map<string, Set<string>>;

    constructor() {
        this.folgeMap = new Map<string, Set<string>>();
        this.vorgaengerMap = new Map<string, Set<string>>();
    }

    addNachFolger(ursprung: string, folger: string): void {
        if (!this.folgeMap.has(ursprung)){
            this.folgeMap.set(ursprung,new Set<string>());
        }
        this.folgeMap.get(ursprung)!.add(folger);
    }
    addVorgaenger(ursprung: string, vorgaenger: string): void {
        if (!this.vorgaengerMap.has(ursprung)){
            this.vorgaengerMap.set(ursprung,new Set<string>());
        }
        this.vorgaengerMap.get(ursprung)!.add(vorgaenger);
    }
    getNachfolger(knoten: string): Set<string> | undefined {
        return this.folgeMap.get(knoten);
    }
    getVorgaenger(knoten: string): Set<string> | undefined {
        return this.vorgaengerMap.get(knoten);
    }

    //gibt alle Knoten mit Ausnahme von play/stop zurück
    getKnoten() : Set<string> {
        let ergebnis =new Set<string>;
        for (let key of this.folgeMap.keys()) {
            if (!["play", "stop"].includes(key)){
                ergebnis.add(key);
            }
        }
        return ergebnis;
    }

    getPlayNodes(): Set<string> | undefined {
        return this.folgeMap.get("play");
    }


    getStopNodes(): Set<string> | undefined {
        return this.vorgaengerMap.get("stop");
    }

    private rekursiveTiefensuche (ausgangsKnoten: string,
                                  gesucht : Set<string>,
                                  besucht: Set<string>,
                                  wegGefunden: Set<string>,
                                  erlaubteKnoten?: Set<string>) : boolean {
        //True, falls Knoten gefunden
        if (gesucht.has(ausgangsKnoten) || wegGefunden.has(ausgangsKnoten)){
            return true;
        }
        if (erlaubteKnoten && !erlaubteKnoten.has(ausgangsKnoten)){
            return false;
        }
        besucht.add(ausgangsKnoten);
        let folgeKnotenMenge = this.getNachfolger(ausgangsKnoten);
        if (folgeKnotenMenge){
            //gehe alle Folgeknoten durch
            for (let folgeKnoten of folgeKnotenMenge) {
                //Prüfe bereits gesucht
                if(!besucht.has(folgeKnoten)){
                    if (this.rekursiveTiefensuche(folgeKnoten, gesucht, besucht, wegGefunden, erlaubteKnoten)){
                        wegGefunden.add(folgeKnoten)
                        return true;
                    }
                }
            }
        }
        return false;
    }

    existiertWeg(A: Set<string>, B:Set<string>, erlaubteKnoten?:Set<string>, ): boolean {
        let wegGefunden = new Set <string>();
        for (let aKnoten of A) {
            let besucht = new Set<string>();
            if (this.rekursiveTiefensuche(aKnoten, B, besucht, wegGefunden, erlaubteKnoten)){
                wegGefunden.add(aKnoten);
            } else {
                return false;
            }
        }
        return true;
    }




}
