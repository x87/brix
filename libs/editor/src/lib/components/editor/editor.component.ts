import { Component, OnInit } from '@angular/core';
import { BinaryReader } from '../../model/BinaryReader';
import { FileStream } from '../../model/FileStream';
import { TemplateParser } from '../../model/TemplateParser';
import { TemplateDumper } from '../../model/TemplateDumper';
import { AST } from '../../model/AST';

@Component({
	selector: 'brix-editor',
	templateUrl: './editor.component.html',
	styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit {

	reader: BinaryReader;
	content: string[];
	scheme: string;
	ast: AST;

	ngOnInit(): void {
		this.scheme = require('raw-loader!../../schemes/chase.scheme.yml');
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
					const template = new TemplateParser(this.scheme);
					this.ast = template.parse(this.reader.data)
				}

			);
			input.value = '';
		}
	}

	onSave(): void {
		const template = new TemplateDumper(this.scheme);
		const blob = template.save(this.ast);

		const a = document.createElement("a");
		document.body.appendChild(a);
		const url = window.URL.createObjectURL(blob);
		a.href = url;
		// todo: file name dialog
		a.download = 'template_dump.bin';
		a.click();
		window.URL.revokeObjectURL(url);
		document.body.removeChild(a);
	}
}
