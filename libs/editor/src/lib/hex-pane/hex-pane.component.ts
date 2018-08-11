import { Component, Input, OnInit } from '@angular/core';

@Component({
	selector: 'brix-hex',
	templateUrl: './hex-pane.component.html',
	styleUrls: ['./hex-pane.component.scss']
})
export class HexPaneComponent implements OnInit {

	@Input() content: string;

	constructor() {
	}

	ngOnInit() {
	}

}
