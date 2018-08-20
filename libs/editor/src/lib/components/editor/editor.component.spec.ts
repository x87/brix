import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollingModule } from '@angular/cdk-experimental/scrolling';
import { FormsModule } from '@angular/forms';

import {
	EditorComponent,
	HexPaneComponent,
	TemplatePaneComponent
} from '../';
import { HexCodePipe, PrintableAsciiPipe } from '../../pipes';

describe('EditorComponent', () => {
	let component: EditorComponent;
	let fixture: ComponentFixture<EditorComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				EditorComponent,
				HexPaneComponent,
				TemplatePaneComponent,
				HexCodePipe,
				PrintableAsciiPipe
			],
			imports: [
				FormsModule,
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
