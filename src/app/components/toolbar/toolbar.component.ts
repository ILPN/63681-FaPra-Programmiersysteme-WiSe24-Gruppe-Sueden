import {Component, inject} from "@angular/core";
import {SelectionType} from "../../classes/selection-type.enum";
import {CutType} from "../../classes/cut-type.enum";
import {ExportType} from "../../classes/export-type.enum";
import {ProcessGraphService} from "../../services/process-graph.service";
import {SelectionService} from "../../services/selection.service";
import {MatDialog} from "@angular/material/dialog";
import {FailedValidationDialog} from "../failed-validation-dialog/failed-validation.dialog";
import {ToolbarService} from "../../services/toolbar.service";
import {FallthroughType} from "../../classes/fallthrough.enum";
import {ValidationResult} from "../../classes/validation-result";
import {PetrinetExporterHelper} from "../../helper/PetriNetExporterHelper";

@Component({
    selector: "toolbar",
    templateUrl: "toolbar.component.html",
    styleUrls: ["toolbar.component.scss"]
})
export class ToolbarComponent {

    protected toolbarService = inject(ToolbarService)
    protected graphService = inject(ProcessGraphService)
    protected selectionService = inject(SelectionService)
    protected dialog = inject(MatDialog)

    protected validateCut() {
        const dfg = this.selectionService.selectedDfg()!
        const selectedNodes = new Set(this.selectionService.selectedNodes().map(it => it.name))

        let result: ValidationResult
        if (this.toolbarService.cutType()) {
            result = this.graphService.validateCut({
                cutType: this.toolbarService.cutType()!,
                dfg: dfg,
                firstNodeSet: selectedNodes
            })
        } else {
            result = this.graphService.validateFallthrough(
                this.selectionService.selectedDfg()!,
                this.toolbarService.fallthroughType()!,
                selectedNodes
            )
        }

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
        let data: string
        switch (type) {
            case ExportType.JSON:
                data = PetrinetExporterHelper.generateJsonString(this.graphService.graphSignal()!)!
                break
            case ExportType.PNML:
                data = PetrinetExporterHelper.generatePnmlString(this.graphService.graphSignal()!)!
                break
        }

        const now = new Date()
        const fileName = `petri_net_${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}_${now.getHours()}_${now.getMinutes()}.${type}`

        const blob = new Blob([data], {type: "text/plain;charset=utf-8"})
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 100) // For firefox
    }

    protected originalOrder = () => 0

    protected readonly SelectionType = SelectionType;
    protected readonly CutType = CutType;
    protected readonly ExportType = ExportType;
    protected readonly Fallthrough = FallthroughType;
}
