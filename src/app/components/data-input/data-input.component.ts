import {Component} from "@angular/core";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";

@Component({
    standalone: true,
    selector: 'data-input',
    templateUrl: './data-input.component.html',
    styleUrls: ['./data-input.component.css'],
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        MatButton
    ]
})
export class DataInputComponent {

    protected dragCounter = 0

    protected onFileInputChange(event: Event) {
        const input = event.target as HTMLInputElement
        const file = input.files![0]
        input.value = ''
        this.handleFile(file)
    }

    protected handleFile(file: File) {
        file.text()
    }

    protected onDragEnter(e: DragEvent) {
        if (e.dataTransfer!.types[0] === 'Files') {
            this.dragCounter++
        }
    }

    protected onDragLeave(e: DragEvent) {
        if (e.dataTransfer!.types[0] === 'Files') {
            this.dragCounter--
        }
    }

    protected onDrop(event: DragEvent) {
        event.preventDefault()
        this.dragCounter = 0
        this.handleFile(event.dataTransfer!.files[0])
    }

    protected parseEventLog(log: string) {

    }

}
