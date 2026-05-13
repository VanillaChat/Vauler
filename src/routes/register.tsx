import { createFileRoute, Link, useNavigate } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import { register } from '../api/auth';
import { ApiError } from '../api/client';
import { t } from '../i18n';

export const Route = createFileRoute('/register')({
	component: RegisterPage,
});

function RegisterPage() {
	const navigate = useNavigate();
	const [username, setUsername] = createSignal('');
	const [email, setEmail] = createSignal('');
	const [password, setPassword] = createSignal('');
	const [confirmPassword, setConfirmPassword] = createSignal('');
	const [inviteCode, setInviteCode] = createSignal('');
	const [error, setError] = createSignal<string | null>(null);
	const [submitting, setSubmitting] = createSignal(false);

	const onSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (password() !== confirmPassword()) {
			setError(t('auth-error-password-mismatch'));
			return;
		}

		setSubmitting(true);
		try {
			await register({
				email: email(),
				password: password(),
				confirmPassword: confirmPassword(),
				username: username(),
				inviteCode: inviteCode().trim() || undefined,
			});
			navigate({ to: '/app' });
		} catch (err) {
			const msg =
				err instanceof ApiError
					? err.message
					: err instanceof Error
						? err.message
						: t('register-error-default');
			setError(msg);
		} finally {
			setSubmitting(false);
		}
	};

	const inputClass =
		'w-full rounded-full bg-white dark:bg-white/5 border border-stone-200 dark:border-stone-800 px-5 py-3 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-600';

	return (
		<div class="-mt-24 grid lg:grid-cols-2 min-h-screen">
			<aside class="bg-[#f7e26c] text-stone-900 px-8 lg:px-16 pt-32 pb-12 lg:py-24 flex flex-col justify-center">
				<div class="max-w-md">
					<div class="flex items-center">
						<img src="/VanillaLogo.svg" alt="" class="w-64 mb-8 rounded-lg text-[#2b1d12]" />
					</div>
					<h1 class="font-display text-5xl lg:text-[3.75rem] tracking-tight leading-[1.05] mb-6">
						{t('register-headline')}
					</h1>
					<p class="font-sans text-lg leading-relaxed opacity-80">{t('register-sub')}</p>
				</div>
			</aside>

			<section class="bg-[#fdfaf3] dark:bg-[#171411] px-8 lg:px-16 py-16 lg:py-24 flex items-center">
				<div class="w-full max-w-sm mx-auto">
					<h2 class="font-display text-4xl tracking-tight text-stone-900 dark:text-stone-100 mb-2">
						{t('register-title')}
					</h2>
					<p class="font-sans text-sm text-stone-500 dark:text-stone-400 mb-10">
						{t('register-subtitle')}
					</p>

					<form onSubmit={onSubmit} class="space-y-4">
						<input
							type="text"
							required
							placeholder={t('register-username')}
							value={username()}
							onInput={(e) => setUsername(e.currentTarget.value)}
							class={inputClass}
						/>
						<input
							type="email"
							required
							placeholder={t('auth-email')}
							value={email()}
							onInput={(e) => setEmail(e.currentTarget.value)}
							class={inputClass}
						/>
						<input
							type="password"
							required
							minLength={8}
							placeholder={t('auth-password')}
							value={password()}
							onInput={(e) => setPassword(e.currentTarget.value)}
							class={inputClass}
						/>
						<input
							type="password"
							required
							minLength={8}
							placeholder={t('register-confirm-password')}
							value={confirmPassword()}
							onInput={(e) => setConfirmPassword(e.currentTarget.value)}
							class={inputClass}
						/>
						<input
							type="text"
							placeholder={t('register-invite-code')}
							value={inviteCode()}
							onInput={(e) => setInviteCode(e.currentTarget.value)}
							class={inputClass}
						/>

						<Show when={error()}>
							<div class="text-sm text-red-600 dark:text-red-400 px-2">{error()}</div>
						</Show>

						<button
							type="submit"
							disabled={submitting()}
							class="w-full bg-vault text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-md hover:shadow-vault/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{submitting() ? t('register-submitting') : t('register-submit')}
						</button>
					</form>

					<p class="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
						{t('register-already')}{' '}
						<Link to="/login" class="text-stone-900 dark:text-white underline underline-offset-4">
							{t('register-sign-in')}
						</Link>
					</p>
				</div>
			</section>
		</div>
	);
}
