import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import { ApiError } from '../api/client';
import { login } from '../api/auth';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email(), password: password() });
      navigate({ to: '/app' });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="-mt-24 grid lg:grid-cols-2 min-h-screen">
      <aside class="bg-[#f7e26c] text-stone-900 px-8 lg:px-16 pt-32 pb-12 lg:py-24 flex flex-col justify-center">
        <div class="max-w-md">
          <div class="flex items-center">
            <img src="/VanillaLogo.svg" alt="" class="w-64 mb-8 rounded-lg text-[#2b1d12]" />
          </div>
          <h1 class="font-display text-5xl lg:text-[3.75rem] tracking-tight leading-[1.05] mb-6">
            Good to see you again.
          </h1>
          <p class="font-sans text-lg leading-relaxed opacity-80">
            Your servers, your friends, your conversations — right where you left them.
          </p>
        </div>
      </aside>

      <section class="bg-[#fdfaf3] dark:bg-[#171411] px-8 lg:px-16 py-16 lg:py-24 flex items-center">
        <div class="w-full max-w-sm mx-auto">
          <h2 class="font-display text-4xl tracking-tight text-stone-900 dark:text-stone-100 mb-2">
            Welcome back.
          </h2>
          <p class="font-sans text-sm text-stone-500 dark:text-stone-400 mb-10">
            Sign in to your account.
          </p>

          <form onSubmit={onSubmit} class="space-y-4">
            <input
              type="email"
              required
              placeholder="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class="w-full rounded-full bg-white dark:bg-white/5 border border-stone-200 dark:border-stone-800 px-5 py-3 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-600"
            />
            <input
              type="password"
              required
              placeholder="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-full rounded-full bg-white dark:bg-white/5 border border-stone-200 dark:border-stone-800 px-5 py-3 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-600"
            />

            <Show when={error()}>
              <div class="text-sm text-red-600 dark:text-red-400 px-2">{error()}</div>
            </Show>

            <button
              type="submit"
              disabled={submitting()}
              class="w-full bg-vault text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-md hover:shadow-vault/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting() ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
            <Link to="/reset-password" class="hover:text-stone-900 dark:hover:text-white underline underline-offset-4">
              Forgot password?
            </Link>
          </p>

          <p class="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
            New here?{' '}
            <Link to="/register" class="text-stone-900 dark:text-white underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
