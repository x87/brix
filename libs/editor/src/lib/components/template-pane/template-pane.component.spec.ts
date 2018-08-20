import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatePaneComponent } from './template-pane.component';

describe('TemplatePaneComponent', () => {
  let component: TemplatePaneComponent;
  let fixture: ComponentFixture<TemplatePaneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplatePaneComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplatePaneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
