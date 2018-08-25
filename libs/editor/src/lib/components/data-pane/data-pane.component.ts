import { Component, Input, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'brix-data-pane',
  templateUrl: './data-pane.component.html',
  styleUrls: ['./data-pane.component.scss']
})
export class DataPaneComponent implements OnChanges {

	@Input() data: DataView;
	@Input() pos: number;

	byte?: number;
	int8?: number;
	word?: number;
	int16?: number;
	dword?: number;
	int32?: number;
	float?: string;

	ngOnChanges(changes: SimpleChanges): void {
		if (this.data && this.pos !== undefined ) {

			// 1
			if (this.pos < this.data.byteLength - 1) {
				this.byte = this.data.getUint8(this.pos);
				this.int8 = this.data.getInt8(this.pos);
			} else {
				this.byte = undefined;
				this.int8 = undefined;
			}

			// 2
			if (this.pos < this.data.byteLength - 2) {
				this.word = this.data.getUint16(this.pos, true);
				this.int16 = this.data.getInt16(this.pos, true);
			} else {
				this.word = undefined;
				this.int16 = undefined;
			}

			// 4
			if (this.pos < this.data.byteLength - 4) {
				this.dword = this.data.getUint32(this.pos, true);
				this.int32 = this.data.getInt32(this.pos, true);
				this.float = this.data.getFloat32(this.pos, true).toPrecision(4);
			} else {
				this.dword = undefined;
				this.int32 = undefined;
				this.float = undefined;
			}
		}
	}
}
