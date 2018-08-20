import * as yml from 'js-yaml';

const arrayRegex = new RegExp('(\\w+)(\\[(.+)\\])?');

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
	String = 'string'
}

export interface Scheme {
	[key: string]: string | Scheme;
}

export interface MainScheme extends Scheme {
	// file scheme may have an optional entry point to start from
	// as there are could be custom structures declared in the same scheme
	entry?: Scheme;
}

export interface Node {
	nodes?: Node[];
	value?: string;
	title?: string;
}

export class AST {
	root?: Node;
}

export class Template {
	private scheme: MainScheme | null;
	private offset: number;

	constructor(scheme: string) {
		this.scheme = yml.safeLoad(scheme);
	}

	parse(data: DataView): AST {
		const ast = new AST();
		this.offset = 0;
		ast.root = {
			nodes: this.parseScheme(data, this.scheme.entry
				? this.scheme.entry
				: this.scheme
			)
		};
		return ast;
	}

	private parseScheme(data: DataView, scheme: Scheme): Node[] {
		const nodes = [];
		for (const [key, type] of Object.entries(scheme)) {
			// nested block
			if (this.isScheme(type)) {
				nodes.push({
					nodes: this.parseScheme(data, type)
				});
			} else {
				// custom struct defined in scheme
				const customType = this.scheme[type];
				if (this.isScheme(customType)) {
					nodes.push({
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

	private moveCursor(declaredType: string): number {
		const { primitive, len } = this.typeToPrimitive(declaredType);
		switch (primitive) {
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
			case Primitive.String:
				this.offset += len;
				return;
			case Primitive.Wchar_t:
				this.offset += len * 2;
				return;

		}
	}

	private readValue(
		data: DataView, offset: number, type: Primitive | string
	): number | string {
		const { primitive, len } = this.typeToPrimitive(type);
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
			case Primitive.String: {
				let i = 0;
				while (i < len && this.readValue(data, offset + i, Primitive.Byte)) {
					i++;
				}
				const utf8View = new Uint8Array(data.buffer, offset, i);
				return String.fromCharCode.apply(null, utf8View);
			}
			case Primitive.Wchar_t: {
				let i = 0;
				while (i < len && this.readValue(data, offset + (i * 2), Primitive.Word)) {
					i++;
				}
				const utf16View = new Uint16Array(data.buffer, offset, i);
				return String.fromCharCode.apply(null, utf16View);
			}
		}
	}

	private typeToPrimitive(type: Primitive | string): { primitive: Primitive; len: number} {
		const matches = arrayRegex.exec(type);
		if (matches) {
			return {
				primitive: this.toPrimitive(matches[1]),
				len: this.getTypeLen(matches[3])
			}
		}
		return { primitive: this.toPrimitive(type), len: 1 };
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
}


