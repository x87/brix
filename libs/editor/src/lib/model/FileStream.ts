import { Observable } from 'rxjs';

export class FileStream {
	stream: Observable<ArrayBuffer>;

	constructor(blob: Blob) {
		this.stream = Observable.create(obs => {
			if (!(blob instanceof Blob)) {
				obs.error(new Error('`blob` must be an instance of File or Blob.'));
				return;
			}

			const reader = new FileReader();

			reader.onerror = err => obs.error(err);
			reader.onabort = err => obs.error(err);
			reader.onload = () => obs.next(reader.result);
			reader.onloadend = () => obs.complete();

			return reader.readAsArrayBuffer(blob);
		});
	}
}


