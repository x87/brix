import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorComponent } from './editor.component';
import { HexPaneComponent } from '../hex-pane/hex-pane.component';
import { ScrollingModule } from '@angular/cdk-experimental/scrolling';
import { HexCodePipe } from '../pipes/HexCode.pipe';
import { PrintableAsciiPipe } from '../pipes/PrintableAscii.pipe';

describe('EditorComponent', () => {
	let component: EditorComponent;
	let fixture: ComponentFixture<EditorComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				EditorComponent,
				HexPaneComponent,
				HexCodePipe,
				PrintableAsciiPipe
			],
			imports: [
				ScrollingModule
			]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(EditorComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
