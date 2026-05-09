import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/solid-router';
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools';
import { Show } from 'solid-js';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Over</Link>
      </div>
    );
  },
});

function RootComponent() {
  const routerState = useRouterState();
  const isApp = () => routerState().location.pathname.startsWith('/app');

  return (
    <>
      <Show when={!isApp()}>
        <nav class="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(64rem,calc(100%-2rem))] flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-lg shadow-black/5">
          <Link to="/" class="flex items-center" aria-label="Vanilla">
            <span
              class="block h-6 w-28 bg-white"
              style={{
                mask: 'url(/VanillaLogo.svg) left center / contain no-repeat',
                '-webkit-mask': 'url(/VanillaLogo.svg) left center / contain no-repeat',
              }}
            />
          </Link>
          <div class="flex items-center gap-2">
            <Link
              to="/login"
              class="px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Login
            </Link>
            <Link
              to="/register"
              class="px-3 py-1.5 rounded-md text-sm font-medium text-gray-900 bg-[#f7e26c] hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </div>
        </nav>
      </Show>
      <main class={isApp() ? '' : 'pt-24'}>
        <Outlet />
      </main>
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
