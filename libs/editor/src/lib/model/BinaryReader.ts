export class BinaryReader {

	data: DataView;
	constructor(buf: ArrayBuffer) {
		this.data = new DataView(buf);
	}

	asBytes(): string[] {
		const utf8View = new Uint8Array(this.data.buffer);
		return utf8View.toString().split(',');
	}


	toString(): string {
		const utf8View = new Uint8Array(this.data.buffer);
		return utf8View.join('');
	}
}
