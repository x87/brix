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

export interface Scope {
	[key: string]: number | string;
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

interface TypeFlags {
	bits?: number;
	align: number
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
				data,
				this.scheme.entry || this.scheme,
				{}
			)
		};
		return ast;
	}

	private parseScheme(data: DataView, scheme: Scheme, parentScope: Scope): Node[] {
		const nodes: Node[] = [];
		const scope: any = {};
		// if (parentScope) scope.$$parent = parentScope;

		if (!scheme) throw new Error('Invalid scheme provided to parseScheme');
		for (const [title, declaredType] of Object.entries(scheme)) {
			const offset = this.offset;

			// nested struct
			if (this.isScheme(declaredType)) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(data, declaredType, scope)
				});
				continue;
			}

			// array
			const { type, count, flags } = this.parseType(declaredType, scope);
			if (count > 1 && !this.isString(type)) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(
						data, this.typeToScheme(type, count, flags, title), scope
					)
				});
				this.moveCursor(Primitive.Byte, flags.align);
				continue;
			}

			// single custom struct
			const customType = this.scheme![type];
			if (this.isScheme(customType) && (type !== 'entry')) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(data, customType, scope)
				});
				this.moveCursor(Primitive.Byte, flags.align);
				continue;
			}

			// single primitive value
			const value = this.readValue(data, offset, type, count);
			const res = flags.bits
				? this.sliceBits(+value, flags.bits)
				: value;
			nodes.push({
				title,
				offset,
				value: res.toString()
			});
			scope[title] = value;
			this.moveCursor(Primitive.Byte, flags.align);
		}
		return nodes;
	}

	private typeToScheme(
		type: string, count: number, flags: TypeFlags, title: string
	): Scheme {
		const res = {};
		const newType = type + (flags.align ? `;align ${flags.align}` : '');
		for (let i = 0; i < count; i += 1) {
			res[`${title}[${i}]`] = newType;
		}
		return res;
	}

	private isString(type: string): boolean {
		return type === Primitive.Wchar_t || type === Primitive.Char;
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
				const res = this.readStringW(data, offset, count);
				this.moveCursor(primitive, count);
				return res;
			}
			if (primitive === Primitive.Char) {
				const res = this.readString(data, offset, count);
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

	private readStringW(data: DataView, offset: number, count: number): string {
		let i = 0;
		while (i < count && this.readPrimitive(Primitive.Word, data, offset + (i * 2))) {
			i++;
		}
		const utf16View = new Uint16Array(data.buffer, offset, i);
		return String.fromCharCode.apply(null, utf16View);
	}

	private readString(data: DataView, offset: number, count: number): string {
		let i = 0;
		while (i < count && this.readPrimitive(Primitive.Byte, data, offset + i)) {
			i++;
		}
		const utf8View = new Uint8Array(data.buffer, offset, i);
		return String.fromCharCode.apply(null, utf8View);
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
				return this.readStringW(data, offset, 1);
		}
	}

	private parseType(declaredType: string, scope: Scope): {
		type: string;
		count: number,
		flags: TypeFlags
	} {

		const { type, flags } = this.extractFlags(declaredType);
		const indexed = arrayRegex.exec(type);
		if (indexed) {
			return {
				type: indexed[1],
				count: this.getTypeLen(indexed[3], scope),
				flags
			}
		}
		const bitfield = bitFieldRegex.exec(type);
		if (bitfield) {
			flags.bits = this.getTypeLen(bitfield[3], scope);

			return {
				type: bitfield[1],
				count: 1,
				flags
			}
		}
		return { type, count: 1, flags };
	}

	private getTypeLen(val: string, scope: Scope): number {
		let number = parseInt(val, 10);
		if (isNaN(number)) {
			let expr = val;
			for (const v in scope) {
				expr = expr.replace(v, (scope[v] || '').toString());
			}
			number = parseInt(eval(expr), 10);
			if (isNaN(number)) {
				throw new Error(`Expected number but got ${val}`);
			}
		}
		return number;
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

	private extractFlags(type: string): { type: string; flags: TypeFlags } {
		const flags: TypeFlags = { align: 0 };
		const parts = type.split(';');
		if (parts.length > 1) {
			const extra = parts[1].split(',');
			for (const e of extra) {
				const [name, value] = e.trim().split(' ');
				switch (name) {
					case 'align':
						const align = parseInt(value, 10);
						if (align > 0) {
							flags.align = align;
						}
						break;
					default:
						throw new Error(`Unknown flag name ${name}`);
				}
			}
		}
		return { type: parts[0].trim(), flags };
	}

}


