import { Show } from 'solid-js';
import type { GatewayChannel } from '../../api/gateway';
import type { Message } from '../../api/messages';
import { t } from '../../i18n';
import { getUser } from '../../state/gateway-data';
import { formatCooldown } from './utils';

type Props = {
	channel: () => GatewayChannel | undefined;
	draft: () => string;
	onDraftInput: (value: string) => void;
	onSend: (e: Event) => void;
	sending: () => boolean;
	cooldown: () => number;
	replyingTo: () => Message | null;
	onCancelReply: () => void;
	composerRef: (el: HTMLTextAreaElement) => void;
};

export function MessageComposer(props: Props) {
	return (
		<form onSubmit={props.onSend} class="px-3 sm:px-6 pb-3 sm:pb-5 pt-2 shrink-0">
			<Show when={props.replyingTo()}>
				{(r) => {
					const refUser = () => getUser(r().authorId);
					const refName = () =>
						r().author?.member?.nickname ?? refUser()?.username ?? r().author?.username ?? '?';
					return (
						<div class="flex items-center gap-2 px-3 py-1.5 -mb-1 rounded-t-2xl bg-[#fdfaf3] dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
							<i class="fa-solid fa-reply text-[#a37b00] dark:text-[#f7e26c]" />
							<span class="truncate">
								{t('reply-to', { name: refName() })}
								<span class="opacity-70"> · {r().content}</span>
							</span>
							<button
								type="button"
								onClick={props.onCancelReply}
								class="ml-auto w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-100 shrink-0"
								title={t('reply-cancel')}
								aria-label={t('reply-cancel')}
							>
								<i class="fa-solid fa-xmark text-xs" />
							</button>
						</div>
					);
				}}
			</Show>
			<div
				class="flex items-stretch gap-2 bg-[#fdfaf3] dark:bg-stone-900 px-3 py-2 focus-within:bg-white dark:focus-within:bg-stone-800 transition-colors shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] focus-within:shadow-[inset_0_0_0_1.5px_#f7e26c]"
				classList={{
					'rounded-2xl': !props.replyingTo(),
					'rounded-b-2xl': !!props.replyingTo(),
				}}
			>
				<button
					type="button"
					class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-2 self-start mt-2"
					title={t('composer-attach')}
				>
					<i class="fa-solid fa-paperclip" />
				</button>
				<textarea
					ref={props.composerRef}
					placeholder={t('composer-placeholder', { name: props.channel()?.name ?? '' })}
					value={props.draft()}
					rows={1}
					onInput={(e) => {
						const el = e.currentTarget;
						el.style.height = 'auto';
						el.style.height = `${Math.min(200, el.scrollHeight)}px`;
						props.onDraftInput(el.value);
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							props.onSend(e);
						}
						if (e.key === 'Escape' && props.replyingTo() && !props.draft()) {
							e.preventDefault();
							props.onCancelReply();
						}
					}}
					class="flex-1 bg-transparent outline-none text-sm placeholder:text-stone-400 placeholder:italic placeholder:font-display resize-none py-2 leading-relaxed"
				/>
				<button
					type="button"
					class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-2 self-start mt-2"
					title={t('composer-emoji')}
				>
					<i class="fa-regular fa-face-smile" />
				</button>
				<button
					type="submit"
					class="self-end w-9 h-9 rounded-xl bg-[#f7e26c] text-stone-900 hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center shrink-0"
					disabled={!props.draft().trim() || props.sending() || props.cooldown() > 0}
					title={
						props.cooldown() > 0
							? t('slowmode-left', { time: formatCooldown(props.cooldown()) })
							: t('composer-send')
					}
				>
					<i
						class={
							props.cooldown() > 0
								? 'fa-solid fa-stopwatch text-xs'
								: props.sending()
									? 'fa-solid fa-spinner fa-spin text-xs'
									: 'fa-solid fa-paper-plane text-xs'
						}
					/>
				</button>
			</div>
		</form>
	);
}
