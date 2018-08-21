import * as yml from 'js-yaml';

const arrayRegex = new RegExp('(\\w+)(\\[(.+)\\])');
const bitFieldRegex = new RegExp('(\\w+)(\\:(\\d+))');

export enum Primitive {
	Byte = 'byte',
	Char = 'char',
	Int8 = 'int8',
	Int16 = 'int16',
	Word = 'word',
	Int32 = 'int32',
	Dword = 'dword',
	Float = 'float',
	Wchar_t = 'wchar_t',
}

export interface Scheme {
	[key: string]: string | Scheme;
}

export type SchemeWithEntry = Scheme & {
	// file scheme may have an optional entry point to start from
	// as there are could be custom structures declared in the same scheme
	entry?: Scheme;
}

export interface Node {
	title: string;
	nodes?: Node[];
	value?: string;
}

export class AST {
	root?: Node;
	traverse(cb: (node: Node, level: number) => void): void {
		let level = 0;
		const walk = (node: Node) => {
			cb(node, level);
			if (node && node.nodes) {
				level ++;
				for (const n of node.nodes) {
					walk(n);
				}
				level --;
			}
		};

		if (this.root) walk(this.root);
	}
}

export class Template {
	private scheme: SchemeWithEntry | null;
	private offset: number;

	constructor(scheme: string) {
		this.scheme = yml.safeLoad(scheme);
	}

	parse(data: DataView): AST {
		if (!this.scheme) throw new Error('No valid scheme');

		const ast = new AST();
		this.offset = 0;
		ast.root = {
			title: '',
			nodes: this.parseScheme(
				data, this.scheme.entry || this.scheme
			)
		};
		return ast;
	}

	private parseScheme(data: DataView, scheme: Scheme): Node[] {
		const nodes: Node[] = [];
		if (!scheme) throw new Error('Invalid scheme provided to parseScheme');

		for (const [key, type] of Object.entries(scheme)) {
			// nested block
			if (this.isScheme(type)) {
				nodes.push({
					title: key,
					nodes: this.parseScheme(data, type)
				});
			} else {
				// custom struct defined in scheme
				const customType = this.scheme![type];
				if (this.isScheme(customType) && (type !== 'entry')) {
					nodes.push({
						title: key,
						nodes: this.parseScheme(data, customType)
					});
				} else {
					// primitive value
					const value = this.readValue(data, this.offset, type);
					this.moveCursor(type);
					nodes.push({
						title: key,
						value: value.toString()
					});
				}
			}
		}
		return nodes;
	}

	private moveCursor(declaredType: string): void {
		const { primitive, count } = this.typeToPrimitive(declaredType);
		switch (primitive) {
			case Primitive.Float:
			case Primitive.Dword:
			case Primitive.Int32:
				this.offset += 4;
				return;
			case Primitive.Word:
			case Primitive.Int16:
				this.offset += 2;
				return;
			case Primitive.Byte:
			case Primitive.Char:
			case Primitive.Int8:
				this.offset += 1;
				return;
			case Primitive.Wchar_t:
				this.offset += count * 2;
				return;
			default:
				throw new Error(`Unknown primitive value ${primitive}`);
		}
	}

	private readValue(
		data: DataView, offset: number, type: Primitive | string
	): number | string {
		const { primitive, count, bits } = this.typeToPrimitive(type);
		if (bits) {
			const value = +this.readValue(data, offset, primitive);
			return this.readBits(value, bits);
		}
		switch (primitive) {
			case Primitive.Dword:
				return data.getUint32(offset, true);
			case Primitive.Word:
				return data.getUint16(offset, true);
			case Primitive.Byte:
				return data.getUint8(offset);

			case Primitive.Int32:
				return data.getInt32(offset, true);
			case Primitive.Int16:
				return data.getInt16(offset, true);
			case Primitive.Char:
			case Primitive.Int8:
				return data.getInt8(offset);

			case Primitive.Float:
				return data.getFloat32(offset, true);
			case Primitive.Wchar_t: {
				let i = 0;
				while (i < count && this.readValue(data, offset + (i * 2), Primitive.Word)) {
					i++;
				}
				const utf16View = new Uint16Array(data.buffer, offset, i);
				return String.fromCharCode.apply(null, utf16View);
			}
		}
	}

	private typeToPrimitive(type: Primitive | string): {
		primitive: Primitive;
		count: number,
		bits?: number
	} {
		const indexed = arrayRegex.exec(type);
		if (indexed) {
			return {
				primitive: this.toPrimitive(indexed[1]),
				count: this.getTypeLen(indexed[3])
			}
		}
		const bitfield = bitFieldRegex.exec(type);
		if (bitfield) {
			return {
				primitive: this.toPrimitive(bitfield[1]),
				count: 1,
				bits: this.getTypeLen(bitfield[3])
			}
		}
		return { primitive: this.toPrimitive(type), count: 1 };
	}

	private getTypeLen(val: string): number {
		return parseInt(val, 10) || 1;
	}

	private isScheme(val: string | Scheme): val is Scheme {
		return typeof(val) === 'object';
	}

	private toPrimitive(val: string): Primitive {
		const primitives = Object.entries(Primitive);
		const lookup = val.toLowerCase();
		for (const [key, primitive] of primitives) {
			if (lookup === primitive) {
				return Primitive[key];
			}
		}
		throw new Error(`Unknown primitive type ${val}`);
	}

	private readBits(value: number, bits: number): number {
		return ((1 << bits) - 1) & value;
	}

}


