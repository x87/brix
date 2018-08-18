import { Component } from '@angular/core';
import { BinaryReader } from '../model/BinaryReader';
import { FileStream } from '../model/FileStream';

@Component({
	selector: 'brix-editor',
	templateUrl: './editor.component.html',
	styleUrls: ['./editor.component.scss']
})
export class EditorComponent {

	reader: BinaryReader;
	content: string[];

	onOpen($event: Event): void {
		const { files } = $event.target as HTMLInputElement;
		if (files.length) {
			const fileStream = new FileStream(files[0]);
			fileStream.stream.subscribe(
				data => {
					this.reader = new BinaryReader(data);
					this.content = this.reader.asBytes();
				}

			);
		}
	}
}
