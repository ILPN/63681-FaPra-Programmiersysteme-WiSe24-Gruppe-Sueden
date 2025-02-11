import {Component, Inject, signal} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {CdkDrag} from "@angular/cdk/drag-drop";

@Component({
    standalone: true,
    templateUrl: "hint.dialog.html",
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButton,
        MatIcon,
        MatDialogClose,
        MatTooltip,
        CdkDrag
    ],
    styleUrls: ["hint.dialog.scss"]
})
export class HintDialog {

    protected masked = signal(true)

    constructor(@Inject(MAT_DIALOG_DATA) protected data: { title: string, message: string }) { }

}
