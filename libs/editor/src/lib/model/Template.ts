import * as yml from 'js-yaml';

const arrayRegex = new RegExp('(.+)(\\[(.+)\\])');
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
	offset: number;
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
			offset: 0,
			nodes: this.parseScheme(
				data, this.scheme.entry || this.scheme
			)
		};
		return ast;
	}

	private parseScheme(data: DataView, scheme: Scheme): Node[] {
		const nodes: Node[] = [];
		if (!scheme) throw new Error('Invalid scheme provided to parseScheme');
		for (const [title, declaredType] of Object.entries(scheme)) {
			const offset = this.offset;

			// nested struct
			if (this.isScheme(declaredType)) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(data, declaredType)
				});
				continue;
			}

			// array
			const { type, count, bits } = this.parseType(declaredType);
			if (count > 1 && !this.isString(type)) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(data, this.typeToScheme(type, count))
				});
				continue;
			}

			// single custom struct
			const customType = this.scheme![type];
			if (this.isScheme(customType) && (type !== 'entry')) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(data, customType)
				});
				continue;
			}

			// single primitive value
			const value = this.readValue(data, offset, type, count);
			const res = bits
				? this.sliceBits(+value, bits)
				: value;
			nodes.push({
				title,
				offset,
				value: res.toString()
			});
		}
		return nodes;
	}

	private typeToScheme(type: string, count: number): Scheme {
		const res = {};
		for (let i = 0; i < count; i += 1) {
			res[i] = type;
		}
		return res;
	}

	private isString(type: string): boolean {
		return type === Primitive.Wchar_t;
	}

	private moveCursor(primitive: Primitive, count: number = 1): void {
		switch (primitive) {
			case Primitive.Float:
			case Primitive.Dword:
			case Primitive.Int32:
				this.offset += 4 * count;
				return;
			case Primitive.Word:
			case Primitive.Int16:
				this.offset += 2 * count;
				return;
			case Primitive.Byte:
			case Primitive.Char:
			case Primitive.Int8:
				this.offset += count;
				return;
			case Primitive.Wchar_t:
				this.offset += 2 * count;
				return;
			default:
				throw new Error(`Unknown primitive value ${primitive}`);
		}
	}

	private readValue(
		data: DataView, offset: number, type: string, count: number
	): number | string | Array<number | string> {
		const primitive = this.toPrimitive(type);
		if (count > 1) {
			if (primitive === Primitive.Wchar_t) {
				const res = this.readWString(data, offset, count);
				this.moveCursor(primitive, count);
				return res;
			}
			throw new Error(`Indexed type ${primitive} used in wrong context`);
		}
		return this.next(primitive, data, offset);
	}

	private next(primitive: Primitive, data: DataView, offset: number): string | number {
		const res = this.readPrimitive(primitive, data, offset);
		this.moveCursor(primitive);
		return res;
	}

	private readWString(
		data: DataView, offset: number, count: number
	): string {
		let i = 0;
		while (i < count && this.readPrimitive(Primitive.Word, data, offset + (i * 2))) {
			i++;
		}
		const utf16View = new Uint16Array(data.buffer, offset, i);
		return String.fromCharCode.apply(null, utf16View);
	}

	private readPrimitive(
		primitive: Primitive, data: DataView, offset: number
	): number | string {
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
			case Primitive.Wchar_t:
				return this.readWString(data, offset, 1);
		}
	}

	private parseType(type: Primitive | string): {
		type: string;
		count: number,
		bits?: number
	} {
		const indexed = arrayRegex.exec(type);
		if (indexed) {
			return {
				type: indexed[1],
				count: this.getTypeLen(indexed[3])
			}
		}
		const bitfield = bitFieldRegex.exec(type);
		if (bitfield) {
			return {
				type: bitfield[1],
				count: 1,
				bits: this.getTypeLen(bitfield[3])
			}
		}
		return { type, count: 1 };
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

	private sliceBits(value: number, bits: number): number {
		return ((1 << bits) - 1) & value;
	}

}


