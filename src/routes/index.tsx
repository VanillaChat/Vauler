import { createFileRoute, Link } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';
import { t } from '../i18n';
import { session } from '../state/session';

export const Route = createFileRoute('/')({
	component: Home,
});

function Home() {
	return (
		<div class="-mt-24 pt-24 bg-[#fdfaf3] dark:bg-[#171411] text-stone-900 dark:text-stone-100 overflow-hidden">
			<Hero />
			<Features />
			<BuiltForSmall />
			<OpenSource />
			<FinalCta />
			<Footer />
		</div>
	);
}

function Hero() {
	return (
		<section class="relative px-6 lg:px-12 pt-20 lg:pt-32 pb-24 lg:pb-40">
			<div
				aria-hidden="true"
				class="pointer-events-none absolute -top-24 -right-24 w-[42rem] h-[42rem] rounded-full bg-[#f7e26c]/40 dark:bg-[#f7e26c]/15 blur-3xl"
			/>
			<div
				aria-hidden="true"
				class="pointer-events-none absolute -bottom-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-orange-200/30 dark:bg-orange-300/10 blur-3xl"
			/>

			<div class="relative max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
				<div class="lg:col-span-7">
					<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900/5 dark:bg-white/10 text-xs tracking-wide uppercase text-stone-600 dark:text-stone-300">
						<span class="w-1.5 h-1.5 rounded-full bg-[#f7e26c]" />
						{t('home-eyebrow')}
					</span>

					<h1 class="font-display tracking-tight leading-[1.05] mt-6 text-5xl sm:text-6xl lg:text-7xl">
						{t('home-headline-a')}
						<br />
						<span class="italic text-stone-500 dark:text-stone-400">{t('home-headline-b')}</span>
					</h1>

					<p class="mt-8 text-lg lg:text-xl leading-relaxed max-w-xl text-stone-600 dark:text-stone-300">
						{t('home-sub')}
					</p>

					<div class="mt-10 flex flex-wrap items-center gap-3">
						<Show
							when={session()}
							fallback={
								<>
									<Link
										to="/register"
										class="group inline-flex items-center gap-2 bg-[#f7e26c] text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-[#f7e26c]/40 transition-shadow"
									>
										{t('home-cta-primary')}
										<span class="transition-transform group-hover:translate-x-0.5">→</span>
									</Link>
									<Link
										to="/login"
										class="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium border border-stone-300 dark:border-stone-700 hover:bg-stone-900/5 dark:hover:bg-white/5 transition-colors"
									>
										{t('home-cta-secondary')}
									</Link>
								</>
							}
						>
							<Link
								to="/app"
								class="group inline-flex items-center gap-2 bg-[#f7e26c] text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-[#f7e26c]/40 transition-shadow"
							>
								{t('home-cta-open')}
								<span class="transition-transform group-hover:translate-x-0.5">→</span>
							</Link>
						</Show>
					</div>

					<p class="mt-6 text-xs tracking-wide uppercase text-stone-500 dark:text-stone-400">
						{t('home-trust')}
					</p>
				</div>

				<div class="lg:col-span-5 lg:pl-4">
					<ChatPreview />
				</div>
			</div>
		</section>
	);
}

function ChatPreview() {
	const messages = [
		{
			name: 'mira',
			tone: 'bg-rose-200 text-rose-900',
			text: t('home-preview-msg-1'),
			t: '7:42',
		},
		{
			name: 'ash',
			tone: 'bg-emerald-200 text-emerald-900',
			text: t('home-preview-msg-2'),
			t: '7:43',
		},
		{
			name: 'jun',
			tone: 'bg-sky-200 text-sky-900',
			text: t('home-preview-msg-3'),
			t: '7:44',
		},
	];

	return (
		<div class="relative">
			<div
				aria-hidden="true"
				class="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#f7e26c]/40 via-orange-200/30 to-rose-200/30 dark:from-[#f7e26c]/15 dark:via-orange-400/10 dark:to-rose-400/10 blur-2xl"
			/>
			<div class="relative rounded-3xl bg-white/80 dark:bg-stone-900/70 backdrop-blur border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-900/5 overflow-hidden">
				<div class="flex items-center justify-between px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-rose-300" />
						<span class="w-2.5 h-2.5 rounded-full bg-amber-300" />
						<span class="w-2.5 h-2.5 rounded-full bg-emerald-300" />
					</div>
					<span class="text-xs font-mono text-stone-500 dark:text-stone-400">
						# {t('home-preview-channel')}
					</span>
					<span class="text-xs text-stone-400 dark:text-stone-500">
						{t('home-preview-online', { count: 3 })}
					</span>
				</div>

				<div class="p-5 space-y-4">
					<For each={messages}>
						{(m) => (
							<div class="flex items-start gap-3">
								<div
									class={`w-9 h-9 rounded-full grid place-items-center font-display text-base ${m.tone}`}
								>
									{m.name[0]}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-baseline gap-2">
										<span class="font-medium text-sm">{m.name}</span>
										<span class="text-[10px] text-stone-400 font-mono">{m.t}</span>
									</div>
									<p class="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{m.text}</p>
								</div>
							</div>
						)}
					</For>

					<div class="flex items-center gap-2 pt-2 text-xs text-stone-400 dark:text-stone-500">
						<span class="typing-dot" />
						<span class="typing-dot" />
						<span class="typing-dot" />
						<span class="ml-1">{t('home-preview-typing')}</span>
					</div>
				</div>

				<div class="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40">
					<div class="flex items-center gap-2 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm text-stone-400">
						{t('home-preview-input', { channel: t('home-preview-channel') })}
					</div>
				</div>
			</div>
		</div>
	);
}

function Features() {
	const items = [
		{
			icon: 'fa-comments',
			title: t('home-feature-rooms-title'),
			body: t('home-feature-rooms-body'),
			tint: 'bg-[#f7e26c]/30 text-stone-900 dark:text-[#f7e26c]',
		},
		{
			icon: 'fa-microphone',
			title: t('home-feature-voice-title'),
			body: t('home-feature-voice-body'),
			tint: 'bg-rose-200/60 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200',
		},
		{
			icon: 'fa-lock',
			title: t('home-feature-private-title'),
			body: t('home-feature-private-body'),
			tint: 'bg-emerald-200/60 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
		},
	];

	return (
		<section class="px-6 lg:px-12 py-20 lg:py-28 border-t border-stone-200/70 dark:border-stone-800/70">
			<div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8">
				<For each={items}>
					{(it) => (
						<article class="group rounded-2xl bg-white/60 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 p-7 hover:border-stone-300 dark:hover:border-stone-700 transition-colors">
							<div
								class={`w-11 h-11 rounded-xl grid place-items-center ${it.tint} group-hover:scale-105 transition-transform`}
							>
								<i class={`fa-solid ${it.icon}`} />
							</div>
							<h3 class="font-display text-2xl tracking-tight mt-5">{it.title}</h3>
							<p class="mt-3 text-stone-600 dark:text-stone-300 leading-relaxed">{it.body}</p>
						</article>
					)}
				</For>
			</div>
		</section>
	);
}

function BuiltForSmall() {
	const stats = [
		{ value: '∞', label: t('home-stat-rooms') },
		{ value: '<60', label: t('home-stat-latency') },
		{ value: '0', label: t('home-stat-ads') },
	];

	return (
		<section class="px-6 lg:px-12 py-20 lg:py-28">
			<div class="max-w-5xl mx-auto text-center">
				<h2 class="font-display text-4xl lg:text-5xl tracking-tight leading-tight">
					{t('home-section-built-title')}
				</h2>
				<p class="mt-6 max-w-2xl mx-auto text-lg text-stone-600 dark:text-stone-300 leading-relaxed">
					{t('home-section-built-body')}
				</p>

				<dl class="mt-14 grid grid-cols-3 gap-4 max-w-3xl mx-auto">
					<For each={stats}>
						{(s) => (
							<div class="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/40 p-6">
								<dt class="font-display text-4xl lg:text-5xl tracking-tight">{s.value}</dt>
								<dd class="mt-2 text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
									{s.label}
								</dd>
							</div>
						)}
					</For>
				</dl>
			</div>
		</section>
	);
}

function OpenSource() {
	return (
		<section class="px-6 lg:px-12 pb-20">
			<div class="max-w-5xl mx-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-stone-900 text-stone-100 dark:bg-stone-950 px-8 lg:px-12 py-12 lg:py-14 relative overflow-hidden">
				<div
					aria-hidden="true"
					class="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#f7e26c]/10 blur-3xl"
				/>
				<div class="relative grid lg:grid-cols-12 gap-8 items-center">
					<div class="lg:col-span-8">
						<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs tracking-wide uppercase text-stone-300">
							<i class="fa-brands fa-github" />
							{t('home-oss-eyebrow')}
						</span>
						<h2 class="font-display text-3xl lg:text-4xl tracking-tight leading-tight mt-5">
							{t('home-oss-title')}
						</h2>
						<p class="mt-4 text-stone-300 leading-relaxed max-w-xl">{t('home-oss-body')}</p>
						<p class="mt-6 text-xs uppercase tracking-wider text-stone-500 font-mono">
							{t('home-oss-meta')}
						</p>
					</div>
					<div class="lg:col-span-4 lg:text-right">
						<a
							href="https://github.com/VanillaChat"
							target="_blank"
							rel="noreferrer"
							class="inline-flex items-center gap-2 bg-[#f7e26c] text-stone-900 px-6 py-3 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-[#f7e26c]/30 transition-shadow"
						>
							<i class="fa-brands fa-github" />
							{t('home-oss-cta')}
						</a>
						<div class="mt-4 inline-flex items-center gap-2 text-xs font-mono text-stone-400">
							<span class="opacity-60">$</span>
							<span class="mr-5">git clone Vanilla</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function FinalCta() {
	return (
		<section class="px-6 lg:px-12 pb-24">
			<div class="max-w-5xl mx-auto rounded-3xl bg-[#f7e26c] text-stone-900 px-8 lg:px-16 py-16 lg:py-20 relative overflow-hidden">
				<div
					aria-hidden="true"
					class="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/40 blur-3xl"
				/>
				<div
					aria-hidden="true"
					class="absolute -left-12 -bottom-20 w-80 h-80 rounded-full bg-orange-300/40 blur-3xl"
				/>
				<div class="relative grid lg:grid-cols-12 gap-8 items-center">
					<div class="lg:col-span-8">
						<h2 class="font-display text-5xl lg:text-6xl tracking-tight leading-[1.05]">
							{t('home-final-headline')}
						</h2>
						<p class="mt-5 text-lg max-w-xl opacity-80">{t('home-final-sub')}</p>
					</div>
					<div class="lg:col-span-4 lg:text-right">
						<Link
							to="/register"
							class="inline-flex items-center gap-2 bg-stone-900 text-[#f7e26c] px-7 py-4 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors"
						>
							{t('home-final-cta')}
							<span>→</span>
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer class="px-6 lg:px-12 py-10 border-t border-stone-200/70 dark:border-stone-800/70">
			<div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-stone-500 dark:text-stone-400">
				<div class="flex items-center gap-3">
					<span
						aria-label={t('brand-name')}
						class="block h-5 w-24 bg-stone-500 dark:bg-stone-400"
						style={{
							mask: 'url(/VanillaLogo.svg) left center / contain no-repeat',
							'-webkit-mask': 'url(/VanillaLogo.svg) left center / contain no-repeat',
						}}
					/>
					<span class="opacity-60">· {t('home-tagline')}</span>
				</div>
				<div class="flex items-center gap-5">
					<Link
						to="/login"
						class="hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
					>
						{t('footer-sign-in')}
					</Link>
					<Link
						to="/register"
						class="hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
					>
						{t('footer-register')}
					</Link>
				</div>
			</div>
		</footer>
	);
}
