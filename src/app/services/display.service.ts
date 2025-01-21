import {computed, Injectable, signal, WritableSignal} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DisplayService {

    height: WritableSignal<number> = signal(800)
    width: WritableSignal<number> = signal(600)

    halfHeight = computed(() => this.height() / 2)
    halfWidth = computed(() => this.width() / 2)

}
