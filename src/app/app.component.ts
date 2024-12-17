import {Component} from '@angular/core';
import {ProcessGraphService} from "./services/process-graph.service";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    constructor(protected processGraphService: ProcessGraphService) {
    }

}
