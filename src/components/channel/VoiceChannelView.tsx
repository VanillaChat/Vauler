import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { ApiError } from '../../api/client';
import { setVoiceChannelState } from '../../api/gateway';
import { fetchVoiceState, joinVoice, leaveVoice } from '../../api/voice';
import { currentUser, getUser, useVoiceParticipants } from '../../state/gateway-data';
import { t } from "../../i18n"

export function VoiceChannelView(props: { channelId: string; channelName: string }) {
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const participants = useVoiceParticipants(() => props.channelId);

	const joined = createMemo(() => participants().some((p) => p.userId === currentUser()?.id));

	const participantName = (userId: string) =>
		getUser(userId)?.username ?? (userId === currentUser()?.id ? currentUser()?.username : userId);

	createEffect(() => {
		const id = props.channelId;
		if (!id) return;

		fetchVoiceState(id)
			.then(setVoiceChannelState)
			.catch((err) => {
				console.error('fetch voice state failed', err);
			});
	});

	const toggleVoice = async () => {
		if (loading()) return;

		setLoading(true);
		setError(null);

		try {
			const next = joined()
				? await leaveVoice(props.channelId)
				: await joinVoice(props.channelId, {
						quality: 'VOICE_LOSSLESS',
						selfMute: false,
						selfDeaf: false,
					});

			setVoiceChannelState(next);
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: err instanceof Error
						? err.message
						: t('voice-update-failed'),
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div class="flex-1 flex items-center justify-center px-6 py-8">
			<div class="w-full max-w-xl rounded-3xl border border-stone-100 dark:border-stone-800 bg-[#fdfaf3] dark:bg-stone-900/40 p-6 sm:p-8 text-center">
				<div class="mx-auto w-16 h-16 rounded-2xl bg-[#f7e26c] text-stone-900 flex items-center justify-center shadow-md shadow-[#f7e26c]/30">
					<i class="fa-solid fa-volume-high text-2xl" />
				</div>

				<h2 class="font-display text-3xl mt-5">{props.channelName}</h2>
				<p class="text-sm text-stone-500 italic font-display mt-1 flex flex-row gap-2 justify-center">
					{t('voice-channel-type')}
					<span class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300">BETA</span>
				</p>

				<button
					type="button"
					onClick={toggleVoice}
					disabled={loading()}
					class="mt-5 w-full rounded-2xl bg-[#f7e26c] text-stone-900 px-4 py-3 font-medium hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow disabled:opacity-60"
				>
					<i
						class={`fa-solid ${
							loading() ? 'fa-spinner fa-spin' : joined() ? 'fa-phone-slash' : 'fa-phone'
						} mr-2`}
					/>
					{joined() ? t('voice-leave') : t('voice-join')}
				</button>

				<Show when={error()}>
					<div class="mt-3 text-sm text-red-600 dark:text-red-400">{error()}</div>
				</Show>

				<div class="mt-6 rounded-2xl bg-white dark:bg-[#211e1b] border border-stone-100 dark:border-stone-800 p-4 text-left">
					<div class="text-xs font-display italic text-stone-500 mb-3">{t('voice-connected-users')}</div>

					<Show
						when={participants().length > 0}
						fallback={
							<div class="text-sm text-stone-400 italic font-display">{t('voice-nobody-connected')}</div>
						}
					>
						<For each={participants()}>
							{(p) => (
								<div class="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-200 py-1">
									<i class="fa-solid fa-circle text-[0.45rem] text-green-500" />
									<span>{participantName(p.userId)}</span>
									<span class="ml-auto text-xs text-stone-400">{p.quality}</span>
								</div>
							)}
						</For>
					</Show>
				</div>
			</div>
		</div>
	);
}
