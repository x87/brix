import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'hexCode'
})
export class HexCodePipe implements PipeTransform {
	transform(value: string): string {
		return ('00' + (parseInt(value, 10).toString(16)))
			.slice(-2)
			.toUpperCase();
	}
}
