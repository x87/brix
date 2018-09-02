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
