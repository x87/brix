import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HexPaneComponent } from './hex-pane.component';

describe('HexPaneComponent', () => {
	let component: HexPaneComponent;
	let fixture: ComponentFixture<HexPaneComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [HexPaneComponent]
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
