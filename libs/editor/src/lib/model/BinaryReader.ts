export class BinaryReader {

	data: DataView;
	constructor(buf: ArrayBuffer) {
		this.data = new DataView(buf);
	}

	asBytes(): string[] {
		const utf8View = new Uint8Array(
			this.data.buffer, 0, this.data.byteLength
		);
		return utf8View.toString().split(',');
	}
}
