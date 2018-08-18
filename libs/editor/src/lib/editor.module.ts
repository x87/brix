import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollingModule } from '@angular/cdk-experimental/scrolling';

import { routes } from './editor.routes';
import { HexPaneComponent } from './hex-pane/hex-pane.component';
import { EditorComponent } from './editor/editor.component';
import { HexCodePipe } from './pipes/HexCode.pipe';
import { PrintableAsciiPipe } from './pipes/PrintableAscii.pipe';


@NgModule({
	declarations: [
		HexPaneComponent,
		EditorComponent,
		HexCodePipe,
		PrintableAsciiPipe
	],
	imports: [
		CommonModule,
		RouterModule.forChild(routes),
		ScrollingModule
	]
})
export class EditorModule {}
