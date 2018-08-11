import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { routes } from './editor.routes';
import { HexPaneComponent } from './hex-pane/hex-pane.component';
import { EditorComponent } from './editor/editor.component';
import { TextPaneComponent } from './text-pane/text-pane.component';


@NgModule({
	declarations: [
		HexPaneComponent,
		EditorComponent,
		TextPaneComponent
	],
	imports: [
		CommonModule,
		RouterModule.forChild(routes)
	]
})
export class EditorModule {}
