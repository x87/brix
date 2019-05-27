import { isNode, Leaf, Node, Primitive, Scheme, Scope, FieldValue } from '.';
import {
  Template,
  TreeStructureMismatchError,
  NoSchemeError
} from './Template';
import { AST } from './AST';

export class TemplateDumper extends Template {
  public save(ast: AST): Blob {
    const views = this.dump(ast.root.nodes, this.entryScheme);
    return new Blob(views.map(v => v.buffer), {
      type: 'application/octet-stream'
    });
  }

  private dump(nodes: Array<Node | Leaf>, scheme: Scheme): DataView[] {
    if (!scheme) {
      throw new NoSchemeError();
    }

    const dataViews: DataView[] = [];
    const scope: Scope = {};
    let nodeIndex = 0;

    for (const [title, declaredType] of Object.entries(scheme)) {
      const node = nodes[nodeIndex++];

      if (!node) {
        throw new TreeStructureMismatchError();
      }

      dataViews.push(...this.getDataViews(node, title, declaredType, scope));
    }
    return dataViews;
  }

  private getDataViews(
    node: Node | Leaf,
    title: string,
    declaredType: string | Scheme,
    scope: Scope
  ): DataView[] {
    // nested struct
    if (this.isScheme(declaredType)) {
      if (!isNode(node)) {
        throw new TreeStructureMismatchError();
      }
      return this.dump(node.nodes, declaredType);
    }

    const { type, count, flags } = this.parseType(declaredType, scope);

    // array
    if (count > 1 && !this.isString(type)) {
      if (!isNode(node)) {
        throw new TreeStructureMismatchError();
      }
      const views = this.dump(
        node.nodes,
        this.typeToScheme(type, count, flags, title)
      );
      if (flags.align) {
        views.push(this.setValue(0, Primitive.Byte, flags.align));
      }
      return views;
    }

    // single custom struct
    if (this.isValidStructName(type)) {
      if (!isNode(node)) {
        throw new TreeStructureMismatchError();
      }

      const views: DataView[] = this.transformPipe(
        [this.schemeRefToTransformCallback(flags.write, scope)],
        this.dump(node.nodes, this.scheme[type] as Scheme)
      );

      if (flags.align) {
        views.push(this.setValue(0, Primitive.Byte, flags.align));
      }

      return views;
    }

    if (isNode(node)) {
      throw new TreeStructureMismatchError();
    }

    // single primitive value
    {
      const scopeRef = title;
      const value: FieldValue = this.transformPrimitive(
        [
          (v: FieldValue) =>
            flags.bits ? this.sliceBits(+value, flags.bits) : value,
          this.schemeRefToTransformCallback(flags.write, scope)
        ],
        scopeRef,
        node.value,
        scope
      );

      this.updateScope(scopeRef, scope, value);

      const views = [this.setValue(value, type, count)];
      if (flags.align) {
        views.push(this.setValue(0, Primitive.Byte, flags.align));
      }

      return views;
    }
  }

  private setValue(
    value: string | number,
    type: string,
    count: number
  ): DataView {
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
