import { Component, OnInit } from '@angular/core';
import { BinaryReader } from '../../model/BinaryReader';
import { FileStream } from '../../model/FileStream';

@Component({
	selector: 'brix-editor',
	templateUrl: './editor.component.html',
	styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit {

	reader: BinaryReader;
	content: string[];
	scheme: string;

	ngOnInit(): void {
		this.scheme = require('raw-loader!../../schemes/test2.scheme.yml');
	}

	onOpen($event: Event): void {
		const input = $event.target as HTMLInputElement;
		const { files } = input;
		if (files && files.length) {
			const fileStream = new FileStream(files[0]);
			fileStream.stream.subscribe(
				data => {
					this.reader = new BinaryReader(data);
					this.content = this.reader.asBytes();
				}

			);
			input.value = '';
		}
	}
}
