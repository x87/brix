import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AST, Template } from '../../model/Template';
import { Node } from '../../model/Template';

@Component({
	selector: 'brix-template-pane',
	templateUrl: './template-pane.component.html',
	styleUrls: ['./template-pane.component.scss']
})
export class TemplatePaneComponent implements OnChanges {
	@Input() scheme: string;
	@Input() data: DataView;

	template: Template;
	ast: AST;

	fields: Array<{
		title: string;
		value: string;
		level: number;
		offset: number;
	}>;

	ngOnChanges(changes: SimpleChanges): void {
		if (this.scheme && this.data) {
			this.template = new Template(this.scheme);
			this.ast = this.template.parse(this.data);

			this.fields = [];
			this.ast.traverse((node: Node, level: number) => {
				this.fields.push({
					title: node.title!,
					value: node.value!,
					offset: node.offset,
					level
				});
			});

		}
	}


}
