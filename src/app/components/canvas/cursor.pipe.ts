import {inject, Pipe, PipeTransform} from "@angular/core";
import {SelectionType} from "../../classes/selection-type.enum";
import {SelectionService} from "../../services/selection.service";

@Pipe({
    standalone: true,
    name: 'canvasCursor'
})
export class CursorPipe implements PipeTransform {

    transform(selectionType: SelectionType, isDfgView: boolean): string {
        if (!isDfgView) {
            return 'cursor-pointer';
        }
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
