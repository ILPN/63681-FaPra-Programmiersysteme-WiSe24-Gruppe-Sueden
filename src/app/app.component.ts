import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ParserService} from './services/parser.service';
import {DisplayService} from './services/display.service';
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
