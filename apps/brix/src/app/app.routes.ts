import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: 'editor', loadChildren: '@brix/editor#EditorModule' },
	{ path: '**', redirectTo: '/editor' }
];
