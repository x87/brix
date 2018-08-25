import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollingModule } from '@angular/cdk-experimental/scrolling';
import { FormsModule } from '@angular/forms';

import { routes } from './editor.routes';
import {
	DataPaneComponent,
	EditorComponent,
	HexPaneComponent,
	TemplatePaneComponent
} from './components';
import {
	HexCodePipe, PrintableAsciiPipe
} from './pipes';

@NgModule({
	declarations: [
		HexPaneComponent,
		EditorComponent,
		TemplatePaneComponent,
		DataPaneComponent,
		HexCodePipe,
		PrintableAsciiPipe
	],
	imports: [
		FormsModule,
		CommonModule,
		RouterModule.forChild(routes),
		ScrollingModule
	]
})
export class EditorModule {}
