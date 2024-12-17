import {Pipe, PipeTransform} from "@angular/core";
import {SelectionType} from "../../classes/selection-type.enum";

@Pipe({
    standalone: true,
    name: 'canvasCursor'
})
export class CursorPipe implements PipeTransform {
    transform(selectionType: SelectionType): string {
        switch (selectionType) {
            case SelectionType.CLICK:
                return 'cursor-pointer'
            case SelectionType.LASSO:
                return 'cursor-crosshair'
            default:
                return ''
        }
    }

}
