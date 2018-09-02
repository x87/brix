import { Node, Primitive, Scheme } from '.';
import { Template } from './Template';
import { AST } from './AST';

export class TemplateDumper extends Template {

	public save(ast: AST): Blob {
		if (!this.scheme) throw new Error('No valid scheme');
		const views = this.dump(ast.root!.nodes!, this.scheme.entry || this.scheme);
		return new Blob(views.map(v => v.buffer), { type: 'application/octet-stream' });
	}

	private dump(nodes: Node[], scheme: Scheme): DataView[] {
		let dataViews: Array<DataView | undefined> = [];
		const scope: any = {};
		let nodeIndex = 0;

		if (!scheme) throw new Error('Invalid scheme provided to dump');
		for (const [title, declaredType] of Object.entries(scheme)) {
			const node = nodes[nodeIndex++];

			if (!node) {
				throw new Error('Error while dumping AST to given template. Index out of bounds');
			}

			// nested struct
			if (this.isScheme(declaredType)) {
				dataViews = dataViews.concat(this.dump(node.nodes!, declaredType));
				continue;
			}

			// array
			const { type, count, flags } = this.parseType(declaredType, scope);
			if (count > 1 && !this.isString(type)) {
				dataViews = dataViews.concat(
					this.dump(node.nodes!, this.typeToScheme(type, count, flags, title)),
					flags.align ? this.setValue(0, Primitive.Byte, flags.align) : undefined
				);
				continue;
			}

			// single custom struct
			const customType = this.scheme![type];
			if (this.isScheme(customType) && (type !== 'entry')) {
				dataViews = dataViews.concat(
					this.dump(node.nodes!, customType),
					flags.align ? this.setValue(0, Primitive.Byte, flags.align) : undefined
				);
				continue;
			}

			// single primitive value
			const value = node.value!;
			const res = flags.bits
				? this.sliceBits(+value, flags.bits)
				: value;
			const view = this.setValue(res!, type, count);
			dataViews = dataViews.concat(
				view,
				flags.align ? this.setValue(0, Primitive.Byte, flags.align) : undefined
			);
			scope[title] = value;
		}
		return dataViews.filter(d => d) as DataView[];
	}

	private setValue(value: string | number, type: string, count: number): DataView {
		const primitive = this.toPrimitive(type);
		switch (primitive) {
			case Primitive.Dword: {
				const buffer = new ArrayBuffer(4 * count);
				const data = new DataView(buffer);
				data.setUint32(0, +value, true);
				return data;
			}
			case Primitive.Int32: {
				const buffer = new ArrayBuffer(4 * count);
				const data = new DataView(buffer);
				data.setInt32(0, +value, true);
				return data;
			}
			case Primitive.Word: {
				const buffer = new ArrayBuffer(2 * count);
				const data = new DataView(buffer);
				data.setUint16(0, +value, true);
				return data;
			}
			case Primitive.Int16: {
				const buffer = new ArrayBuffer(2 * count);
				const data = new DataView(buffer);
				data.setInt16(0, +value, true);
				return data;
			}
			case Primitive.Byte: {
				const buffer = new ArrayBuffer(count);
				const data = new DataView(buffer);
				data.setUint8(0, +value);
				return data;
			}
			case Primitive.Int8: {
				const buffer = new ArrayBuffer(count);
				const data = new DataView(buffer);
				data.setInt8(0, +value);
				return data;
			}
			case Primitive.Float: {
				const buffer = new ArrayBuffer(4 * count);
				const data = new DataView(buffer);
				data.setFloat32(0, +value, true);
				return data;
			}
			case Primitive.Char: {
				const buffer = new ArrayBuffer(count);
				const data = new DataView(buffer);
				const s = value as string;
				for (let i = 0; i < s.length; i += 1) {
					data.setUint8(i, s.charCodeAt(i));
				}
				return data;
			}
			case Primitive.Wchar_t: {
				const buffer = new ArrayBuffer(2 * count);
				const data = new DataView(buffer);
				const s = value as string;
				for (let i = 0; i < s.length; i += 1) {
					data.setUint16(i * 2, s.charCodeAt(i), true);
				}
				return data;
			}
			default:
				throw new Error(`Unsupported primitive type ${type}`);
		}
	}

}
