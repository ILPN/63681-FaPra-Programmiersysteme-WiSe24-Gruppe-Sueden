import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {APP_BASE_HREF, PlatformLocation} from "@angular/common";
import {provideHttpClient, withInterceptorsFromDi} from "@angular/common/http";
import {DataInputComponent} from "./components/data-input/data-input.component";
import {CanvasComponent} from "./components/canvas/canvas.component";
import {MatOption, MatSelect} from "@angular/material/select";
import {MatTooltip} from "@angular/material/tooltip";
import {DfgComponent} from "./components/canvas/dfg/dfg.component";
import {MatMenu, MatMenuItem, MatMenuTrigger} from "@angular/material/menu";
import {CursorPipe} from "./components/canvas/cursor.pipe";
import {ToolbarComponent} from "./components/toolbar/toolbar.component";
import {MatRipple} from "@angular/material/core";
import {EventLogComponent} from "./components/canvas/event-log/event-log.component";
import {PlaceComponent} from "./components/canvas/place/place.component";
import {NodeComponent} from "./components/canvas/node/node.component";
import {EdgeComponent} from "./components/canvas/edge/edge.component";

@NgModule({
    declarations: [
        AppComponent,
        ToolbarComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        ReactiveFormsModule,
        DataInputComponent,
        MatSelect,
        MatOption,
        FormsModule,
        MatTooltip,
        DfgComponent,
        CursorPipe,
        MatMenu,
        MatMenuTrigger,
        MatMenuItem,
        MatRipple,
        EventLogComponent,
        PlaceComponent,
        NodeComponent,
        EdgeComponent,
        CanvasComponent
    ],
    providers: [
        {
            provide: APP_BASE_HREF,
            useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(),
            deps: [PlatformLocation]
        },
        provideHttpClient(withInterceptorsFromDi())
    ]
})
export class AppModule {
}
