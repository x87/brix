import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { NxModule } from '@nrwl/nx';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		NxModule.forRoot(),
		RouterModule.forRoot(routes, { initialNavigation: 'enabled' })
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {
}
