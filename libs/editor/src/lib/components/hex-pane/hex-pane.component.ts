import {
	Component,
	ElementRef,
	HostListener,
	Input,
	ViewChild
} from '@angular/core';

@Component({
	selector: 'brix-hex',
	templateUrl: './hex-pane.component.html',
	styleUrls: ['./hex-pane.component.scss']
})
export class HexPaneComponent {

	rows: string[];
	private _content: string[];
	@ViewChild('pane') pane: ElementRef;

	@Input()
	set content(chars: string[]) {
		this._content = chars;
		this.rows = this.chunks(this._content, this.capacity);
	}

	@HostListener('window:resize', [])
	onResize() {
		this.rows = this.chunks(this._content, this.capacity);
	}

	get capacity(): number {
		const scrollWidth = 8; // todo;
		const width = this.pane.nativeElement.clientWidth - scrollWidth;
		const hexCharWidth = 20;
		const textCharWidth = 8;
		return Math.ceil(width / (hexCharWidth + textCharWidth)) - 1;
	}

	private chunks(chars: string[], size: number): string[] {
		if (!chars) return [];

		const numChunks = Math.ceil(chars.length / size);
		const chunks = new Array(numChunks);

		for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
			chunks[i] = chars
				.slice(o, o + size);
		}

		return chunks;
	}

}
