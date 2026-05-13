import { render } from 'solid-js/web';
import 'solid-devtools';
import { createRouter, RouterProvider } from '@tanstack/solid-router';
import { routeTree } from './routeTree.gen';
import './styles.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Set up a Router instance
const router = createRouter({
	routeTree,
	defaultStaleTime: 5000,
	scrollRestoration: true,
});

// Register things for typesafety
declare module '@tanstack/solid-router' {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById('app');

if (!rootElement) {
	throw new Error('Root element #app not found');
}

if (!rootElement.innerHTML) {
	render(() => <RouterProvider router={router} />, rootElement);
}
