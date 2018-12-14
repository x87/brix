import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AST } from '../../model/AST';
import { isNode, Leaf, Node } from '../../model';

@Component({
	selector: 'brix-template-pane',
	templateUrl: './template-pane.component.html',
	styleUrls: ['./template-pane.component.scss']
})
export class TemplatePaneComponent implements OnChanges {
	@Input() ast: AST;
	@Input() data: DataView;

	fields: Array<{
		title: string;
		value: string;
		level: number;
		offset: number;
	}>;

	ngOnChanges(changes: SimpleChanges): void {
		if (this.ast && this.data) {
			this.fields = [];
			this.ast.traverse((node: Node | Leaf, level: number) => {
				this.fields.push({
					title: node.title,
					value: isNode(node) ? '' : node.value,
					offset: node.offset,
					level
				});
			});

		}
	}

}
