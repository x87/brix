import { isNode, Leaf, Node, Tree } from '.';

export class AST implements Tree {
	constructor(public root: Node) { }
	traverse(cb: (node: Node | Leaf, level: number) => void): void {
		let level = 0;
		const walk = (node: Node | Leaf) => {
			cb(node, level);
			if (node && isNode(node)) {
				level++;
				for (const n of node.nodes) {
					walk(n);
				}
				level--;
			}
		};

		walk(this.root);
	}
}
