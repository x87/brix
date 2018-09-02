import { Node, Primitive, Scheme } from '.';
import { Template } from './Template';
import { AST } from './AST';

export class TemplateParser extends Template {
	private offset: number;

	public parse(data: DataView, title: string = ''): AST {
		if (!this.scheme) throw new Error('No valid scheme');

		const ast = new AST();
		this.offset = 0;
		ast.root = {
			title,
			offset: 0,
			nodes: this.parseScheme(
				data,
				this.scheme.entry || this.scheme
			)
		};
		return ast;
	}

	private parseScheme(data: DataView, scheme: Scheme): Node[] {
		const nodes: Node[] = [];
		const scope: any = {};

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
			const { type, count, flags } = this.parseType(declaredType, scope);
			if (count > 1 && !this.isString(type)) {
				nodes.push({
					title,
					offset,
					nodes: this.parseScheme(
						data, this.typeToScheme(type, count, flags, title)
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
					nodes: this.parseScheme(data, customType)
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
		const value = this.readPrimitive(primitive, data, offset);
		this.moveCursor(primitive);
		return value;
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
}
