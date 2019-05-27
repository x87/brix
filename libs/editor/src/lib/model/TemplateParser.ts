import { Leaf, Node, Primitive, Scheme, FieldValue, Scope } from '.';
import { Template, NoSchemeError } from './Template';
import { AST } from './AST';

function ScopeFactory(data: DataView): Scope {
  return {
    fileSize: () => data.byteLength
  };
}

export class TemplateParser extends Template {
  private offset: number;
  private data: DataView;

  public parse(data: DataView, title: string = ''): AST {
    this.offset = 0;
    this.data = data;
    return new AST({
      title,
      offset: 0,
      nodes: this.parseScheme(this.entryScheme)
    });
  }

  private parseScheme(scheme: Scheme): Array<Node | Leaf> {
    if (!scheme) {
      throw new NoSchemeError();
    }
    const scope = ScopeFactory(this.data);
    return Object.entries(scheme).map(([title, declaredType]) =>
      this.getNode(title, declaredType, scope)
    );
  }

  private getNode(
    title: string,
    declaredType: string | Scheme,
    scope: Scope
  ): Node | Leaf {
    const offset = this.offset;

    // nested struct
    if (this.isScheme(declaredType)) {
      const node = {
        title,
        offset,
        nodes: this.parseScheme(declaredType)
      };
      return node;
    }

    const { type, count, flags } = this.parseType(declaredType, scope);

    // array
    if (count > 1 && !this.isString(type)) {
      const node = {
        title,
        offset,
        nodes: this.parseScheme(this.typeToScheme(type, count, flags, title))
      };
      this.moveCursor(Primitive.Byte, flags.align);
      return node;
    }

    // single custom struct
    if (this.isValidStructName(type)) {
      const value: Array<Node | Leaf> = this.transformPipe(
        [this.schemeRefToTransformCallback(flags.read, scope)],
        this.parseScheme(this.scheme[type] as Scheme)
      );

      const node = {
        title,
        offset,
        nodes: value
      };
      this.moveCursor(Primitive.Byte, flags.align);
      return node;
    }

    // single primitive value
    {
      const scopeRef = title;
      const value: FieldValue = this.transformPrimitive(
        [
          this.schemeRefToTransformCallback(flags.read, scope),
          (v: FieldValue) => (flags.bits ? this.sliceBits(+v, flags.bits) : v)
        ],
        scopeRef,
        this.readValue(offset, type, count),
        scope
      );

      this.updateScope(scopeRef, scope, value);
      this.moveCursor(Primitive.Byte, flags.align);

      const node = {
        title,
        offset,
        value: value.toString()
      };
      return node;
    }
  }

  private readValue(
    offset: number,
    type: string,
    count: number
  ): number | string {
    const primitive = this.toPrimitive(type);
    if (count > 1) {
      if (primitive === Primitive.Wchar_t) {
        const res = this.readStringW(offset, count);
        this.moveCursor(primitive, count);
        return res;
      }
      if (primitive === Primitive.Char) {
        const res = this.readString(offset, count);
        this.moveCursor(primitive, count);
        return res;
      }
      throw new Error(`Indexed type ${primitive} used in wrong context`);
    }
    const value = this.readPrimitive(primitive, offset);
    this.moveCursor(primitive);
    return value;
  }

  private readStringW(offset: number, maxLength: number): string {
    let i = 0;
    while (
      i < maxLength &&
      this.readPrimitive(Primitive.Word, offset + i * 2)
    ) {
      i++;
    }
    const utf16View = new Uint16Array(this.data.buffer, offset, i);
    return String.fromCharCode.apply(null, utf16View);
  }

  private readString(offset: number, maxLength: number): string {
    let i = 0;
    while (i < maxLength && this.readPrimitive(Primitive.Byte, offset + i)) {
      i++;
    }
    const utf8View = new Uint8Array(this.data.buffer, offset, i);
    return String.fromCharCode.apply(null, utf8View);
  }

  private readPrimitive(primitive: Primitive, offset: number): number | string {
    switch (primitive) {
      case Primitive.Dword:
        return this.data.getUint32(offset, true);
      case Primitive.Word:
        return this.data.getUint16(offset, true);
      case Primitive.Byte:
        return this.data.getUint8(offset);
      case Primitive.Int32:
        return this.data.getInt32(offset, true);
      case Primitive.Int16:
        return this.data.getInt16(offset, true);
      case Primitive.Char:
      case Primitive.Int8:
        return this.data.getInt8(offset);
      case Primitive.Float:
        return this.data.getFloat32(offset, true);
      case Primitive.Wchar_t:
        return this.readStringW(offset, 1);
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
