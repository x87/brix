import { Node } from '.';

export class AST {
	root?: Node;
	traverse(cb: (node: Node, level: number) => void): void {
		let level = 0;
		const walk = (node: Node) => {
			cb(node, level);
			if (node && node.nodes) {
				level++;
				for (const n of node.nodes) {
					walk(n);
				}
				level--;
			}
		};

		if (this.root) walk(this.root);
	}
}
