import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HexPaneComponent } from './hex-pane.component';
import { ScrollingModule } from '@angular/cdk-experimental/scrolling';
import { HexCodePipe } from '../pipes/HexCode.pipe';
import { PrintableAsciiPipe } from '../pipes/PrintableAscii.pipe';

describe('HexPaneComponent', () => {
	let component: HexPaneComponent;
	let fixture: ComponentFixture<HexPaneComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				HexPaneComponent,
				HexCodePipe,
				PrintableAsciiPipe
			],
			imports: [ScrollingModule]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(HexPaneComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
