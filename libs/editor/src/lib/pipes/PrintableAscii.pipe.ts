import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'printableAscii'
})
export class PrintableAsciiPipe implements PipeTransform {
	transform(value: string): string {
		const charCode = parseInt(value, 10);
		return charCode < 32
			? '.'
			: String.fromCharCode(charCode);
	}
}
