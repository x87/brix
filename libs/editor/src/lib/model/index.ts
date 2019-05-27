export enum Primitive {
  Byte = 'byte',
  Char = 'char',
  Int8 = 'int8',
  Int16 = 'int16',
  Word = 'word',
  Int32 = 'int32',
  Dword = 'dword',
  Float = 'float',
  Wchar_t = 'wchar_t'
}

export interface Scheme {
  [key: string]: string | Scheme;
}

export type SchemeWithEntry = Scheme & {
  // file scheme may have an optional entry point to start from
  // as there are could be custom structures declared in the same scheme
  entry?: Scheme;
};

export type FieldValue = number | string;

export interface Scope {
  [key: string]: FieldValue | FieldValue[] | (() => FieldValue) | (() => FieldValue[]);
}

export interface Tree {
  root: Node;
}

export interface Leaf {
  title: string;
  offset: number;
  value: string;
}

export interface Node {
  title: string;
  offset: number;
  nodes: Array<Node | Leaf>;
}

export const isNode = (node: Node | Leaf): node is Node => {
  return 'nodes' in node;
};
