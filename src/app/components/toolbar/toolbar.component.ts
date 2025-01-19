import {Component, inject} from "@angular/core";
import {SelectionType} from "../../classes/selection-type.enum";
import {CutType} from "../../classes/cut-type.enum";
import {ExportType} from "../../classes/export-type.enum";
import {ProcessGraphService} from "../../services/process-graph.service";
import {SelectionService} from "../../services/selection.service";
import {MatDialog} from "@angular/material/dialog";
import {FailedValidationDialog} from "../failed-validation-dialog/failed-validation.dialog";
import {ToolbarService} from "../../services/toolbar.service";

@Component({
    selector: "toolbar",
    templateUrl: "toolbar.component.html",
    styleUrls: ["toolbar.component.scss"]
})
export class ToolbarComponent {

    protected toolbarService = inject(ToolbarService)

    protected readonly SelectionType = SelectionType;
    protected readonly CutType = CutType;
    protected readonly ExportType = ExportType;

    constructor(protected service: ProcessGraphService,
                protected selectionService: SelectionService,
                protected dialog: MatDialog) {
    }

    protected originalOrder = () => 0

    protected validateCut() {
        const result = this.service.validateCut({
            cutType: this.toolbarService.cutType(),
            dfg: this.selectionService.selectedDfg()!,
            firstNodeSet: new Set(this.selectionService.selectedNodes().map(it => it.name))
        })

        if (!result.success) {
            this.dialog.open(FailedValidationDialog, {
                width: '500px',
                data: {
                    message: result.comment
                }
            })
        }
    }

    protected export(type: ExportType) {
        console.log("Export as " + type)
    }

}
