import { Component, ViewEncapsulation } from '@angular/core';

@Component({
	selector: 'brix-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class AppComponent {
	title = 'brix';
}
