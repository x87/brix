import * as yml from 'js-yaml';
import { Primitive, Scheme, SchemeWithEntry, Scope } from '.';

const arrayRegex = new RegExp('(.+)(\\[(.+)\\])');
const bitFieldRegex = new RegExp('(\\w+)(\\:(\\d+))');

interface TypeFlags {
	bits?: number;
	align: number
}

export class Template {
	protected scheme: SchemeWithEntry | null;

	constructor(scheme: string) {
		this.scheme = yml.safeLoad(scheme);
	}

	protected typeToScheme(
		type: string, count: number, flags: TypeFlags, title: string
	): Scheme {
		const res = {};
		const newType = type + (flags.align ? `;align ${flags.align}` : '');
		for (let i = 0; i < count; i += 1) {
			res[`${title}[${i}]`] = newType;
		}
		return res;
	}

	protected isString(type: string): boolean {
		return type === Primitive.Wchar_t || type === Primitive.Char;
	}

	protected parseType(declaredType: string, scope: Scope): {
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
			};
		}
		const bitfield = bitFieldRegex.exec(type);
		if (bitfield) {
			flags.bits = this.getTypeLen(bitfield[3], scope);

			return {
				type: bitfield[1],
				count: 1,
				flags
			};
		}
		return { type, count: 1, flags };
	}

	protected getTypeLen(val: string, scope: Scope): number {
		let number = parseInt(val, 10);
		if (isNaN(number)) {
			let expr = val;
			for (const v in scope) {
				if (typeof scope[v] !== 'undefined') {
					expr = expr.replace(v, scope[v].toString());
				}
			}
			number = parseInt(eval(expr), 10);
			if (isNaN(number)) {
				throw new Error(`Expected number but got ${val}`);
			}
		}
		return number;
	}

	protected isScheme(val: string | Scheme): val is Scheme {
		return typeof(val) === 'object';
	}

	protected toPrimitive(val: string): Primitive {
		const primitives = Object.entries(Primitive);
		const lookup = val.toLowerCase();
		for (const [key, primitive] of primitives) {
			if (lookup === primitive) {
				return Primitive[key];
			}
		}
		throw new Error(`Unknown primitive type ${val}`);
	}

	protected sliceBits(value: number, bits: number): number {
		return ((1 << bits) - 1) & value;
	}

	protected extractFlags(type: string): { type: string; flags: TypeFlags } {
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


