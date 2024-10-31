import { DirectlyFollows } from './directlyFollows';

export interface ValidationData {
    dfg: DirectlyFollows;
    knotenMengeA: Set<string>;
    knotenMengeB: Set<string>;
    cut: string;
}
