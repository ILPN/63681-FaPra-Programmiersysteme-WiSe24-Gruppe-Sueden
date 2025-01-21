import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";

@Component({
    standalone: true,
    templateUrl: "failed-validation.dialog.html",
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButton,
        MatIcon,
        MatDialogClose
    ]
})
export class FailedValidationDialog {

    constructor(@Inject(MAT_DIALOG_DATA) protected data: { message: string }) { }

}
