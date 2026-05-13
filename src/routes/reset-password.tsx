import { createFileRoute, Link } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import { t } from '../i18n';

export const Route = createFileRoute('/reset-password')({
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const [email, setEmail] = createSignal('');
	const [sent, setSent] = createSignal(false);

	const onSubmit = (e: Event) => {
		e.preventDefault();
		console.log('reset-password', { email: email() });
		setSent(true);
	};

	return (
		<div class="-mt-24 grid lg:grid-cols-2 min-h-screen">
			<aside class="bg-[#f7e26c] text-stone-900 px-8 lg:px-16 pt-32 pb-12 lg:py-24 flex flex-col justify-center">
				<div class="max-w-md">
					<div class="flex items-center">
						<img src="/VanillaLogo.svg" alt="" class="w-64 mb-8 rounded-lg text-[#2b1d12]" />
					</div>
					<h1 class="font-display text-5xl lg:text-[3.75rem] tracking-tight leading-[1.05] mb-6">
						{t('reset-headline')}
					</h1>
					<p class="font-sans text-lg leading-relaxed opacity-80">{t('reset-sub')}</p>
				</div>
			</aside>

			<section class="bg-[#fdfaf3] dark:bg-[#171411] px-8 lg:px-16 py-16 lg:py-24 flex items-center">
				<div class="w-full max-w-sm mx-auto">
					<Show
						when={!sent()}
						fallback={
							<>
								<h2 class="font-display text-4xl tracking-tight text-stone-900 dark:text-stone-100 mb-2">
									{t('reset-sent-title')}
								</h2>
								<p class="font-sans text-sm text-stone-500 dark:text-stone-400 mb-10">
									{t('reset-sent-msg', { email: email() })}
								</p>
								<Link
									to="/login"
									class="inline-flex w-full justify-center bg-vault text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-md hover:shadow-vault/40 transition-shadow"
								>
									{t('reset-back')}
								</Link>
								<p class="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
									{t('reset-wrong-email')}{' '}
									<button
										type="button"
										onClick={() => setSent(false)}
										class="text-stone-900 dark:text-white underline underline-offset-4"
									>
										{t('reset-try-again')}
									</button>
								</p>
							</>
						}
					>
						<h2 class="font-display text-4xl tracking-tight text-stone-900 dark:text-stone-100 mb-2">
							{t('reset-title')}
						</h2>
						<p class="font-sans text-sm text-stone-500 dark:text-stone-400 mb-10">
							{t('reset-subtitle')}
						</p>

						<form onSubmit={onSubmit} class="space-y-4">
							<input
								type="email"
								required
								placeholder={t('auth-email')}
								value={email()}
								onInput={(e) => setEmail(e.currentTarget.value)}
								class="w-full rounded-full bg-white dark:bg-white/5 border border-stone-200 dark:border-stone-800 px-5 py-3 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-600"
							/>

							<button
								type="submit"
								class="w-full bg-vault text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-md hover:shadow-vault/40 transition-shadow"
							>
								{t('reset-submit')}
							</button>
						</form>

						<p class="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
							{t('reset-remembered')}{' '}
							<Link to="/login" class="text-stone-900 dark:text-white underline underline-offset-4">
								{t('reset-back')}
							</Link>
						</p>
					</Show>
				</div>
			</section>
		</div>
	);
}
