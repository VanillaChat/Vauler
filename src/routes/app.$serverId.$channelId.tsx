import { createFileRoute } from '@tanstack/solid-router';
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { ApiError } from '../api/client';
import { gatewayState } from '../api/gateway';
import { createChannelInvite } from '../api/invites';
import {
	type CreateMessageRequest,
	createMessage,
	deleteMessage,
	editMessage,
	fetchMessages,
	type Message,
	sendTyping,
} from '../api/messages';
import { ChannelHeader } from '../components/channel/ChannelHeader';
import {
	type DeleteCandidate,
	DeleteMessageDialog,
} from '../components/channel/DeleteMessageDialog';
import { InviteBanner } from '../components/channel/InviteBanner';
import { JumpToBottomButton } from '../components/channel/JumpToBottomButton';
import { MessageComposer } from '../components/channel/MessageComposer';
import { type CtxMenuState, MessageContextMenu } from '../components/channel/MessageContextMenu';
import { MessageItem } from '../components/channel/MessageItem';
import { SlowmodeIndicator } from '../components/channel/SlowmodeIndicator';
import { TypingIndicator } from '../components/channel/TypingIndicator';
import { VoiceChannelView } from '../components/channel/VoiceChannelView';
import { useLayout } from '../contexts/layout';
import { t } from '../i18n';
import { currentUser, useChannel, useGuild } from '../state/gateway-data';
import {
	addMessage,
	isChannelExhausted,
	isChannelLoaded,
	markChannelExhausted,
	markChannelLoaded,
	messageStore,
	prependMessages,
	removeMessage as removeLocalMessage,
	setChannelMessages,
	updateMessage as updateLocalMessage,
} from '../state/messages';
import { lastSentStore, recordSent } from '../state/slowmode';
import { typingStore } from '../state/typing';

export const Route = createFileRoute('/app/$serverId/$channelId')({
	component: ChannelView,
});

const PAGE_SIZE = 50;
const ANIM_MS = 130;

function ChannelView() {
	const params = Route.useParams();
	const channel = useChannel(
		() => params().serverId,
		() => params().channelId,
	);

	const isVoiceChannel = createMemo(() => (channel()?.type ?? 'TEXT').toUpperCase() === 'VOICE');

	const guild = useGuild(() => params().serverId);
	const isOwner = () => guild()?.ownerId === currentUser()?.id;
	const layout = useLayout();

	const messages = createMemo(() => {
		const list = messageStore()[params().channelId] ?? [];
		return [...list].sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)));
	});

	const typing = createMemo(() => typingStore()[params().channelId] ?? []);
	const typingText = createMemo(() => {
		const list = typing();
		if (list.length === 0) return null;
		if (list.length === 1) return t('typing-one', { name: list[0].username });
		if (list.length === 2) return t('typing-two', { a: list[0].username, b: list[1].username });
		if (list.length === 3)
			return t('typing-three', {
				a: list[0].username,
				b: list[1].username,
				c: list[2].username,
			});
		return t('typing-many');
	});

	const [draft, setDraft] = createSignal('');
	const [loadingHistory, setLoadingHistory] = createSignal(false);
	const [loadingOlder, setLoadingOlder] = createSignal(false);
	const [atBottom, setAtBottom] = createSignal(true);
	const [unread, setUnread] = createSignal(0);
	const [replyingTo, setReplyingTo] = createSignal<Message | null>(null);
	const [highlightId, setHighlightId] = createSignal<string | null>(null);
	let scrollEl: HTMLDivElement | undefined;
	let composerEl: HTMLTextAreaElement | undefined;
	let highlightTimer: number | null = null;

	const loadInitial = async (id: string) => {
		if (gatewayState() !== 'ready') return;
		if (isChannelLoaded(id) || loadingHistory()) return;
		setLoadingHistory(true);
		try {
			const list = await fetchMessages(id, { limit: PAGE_SIZE });
			setChannelMessages(id, list ?? []);
			markChannelLoaded(id);
			if ((list?.length ?? 0) < PAGE_SIZE) markChannelExhausted(id);
			requestAnimationFrame(() => {
				if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
			});
		} catch (err) {
			console.error('fetch messages failed', err);
		} finally {
			setLoadingHistory(false);
		}
	};

	const loadOlder = async () => {
		const id = params().channelId;
		if (gatewayState() !== 'ready') return;
		if (loadingOlder() || isChannelExhausted(id)) return;
		const list = messages();
		const oldest = list[0];
		if (!oldest) return;
		setLoadingOlder(true);
		const prevHeight = scrollEl?.scrollHeight ?? 0;
		const prevTop = scrollEl?.scrollTop ?? 0;
		try {
			const older = await fetchMessages(id, { before: oldest.id, limit: PAGE_SIZE });
			if (!older?.length || older.length < PAGE_SIZE) markChannelExhausted(id);
			if (older?.length) prependMessages(id, older);
			requestAnimationFrame(() => {
				if (scrollEl) {
					scrollEl.scrollTop = prevTop + (scrollEl.scrollHeight - prevHeight);
				}
			});
		} catch (err) {
			console.error('fetch older failed', err);
		} finally {
			setLoadingOlder(false);
		}
	};

	createEffect(() => {
		const id = params().channelId;
		if (!id) return;
		if (gatewayState() !== 'ready') return;
		if (isVoiceChannel()) return;
		loadInitial(id);
	});

	createEffect<number>((prevLen) => {
		const len = messages().length;
		if (!scrollEl) return len;
		if (len > prevLen) {
			if (atBottom()) {
				requestAnimationFrame(() => {
					if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
				});
			} else {
				setUnread((u) => u + (len - prevLen));
			}
		}
		return len;
	}, 0);

	createEffect(
		on(
			() => params().channelId,
			() => {
				setAtBottom(true);
				setUnread(0);
			},
			{ defer: true },
		),
	);

	const onScroll = () => {
		if (!scrollEl) return;
		if (scrollEl.scrollTop < 120) loadOlder();
		const near = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 80;
		setAtBottom(near);
		if (near) setUnread(0);
	};

	const scrollToBottom = (smooth = true) => {
		if (!scrollEl) return;
		scrollEl.scrollTo({
			top: scrollEl.scrollHeight,
			behavior: smooth ? 'smooth' : 'auto',
		});
		setUnread(0);
	};

	const jumpToMessage = (id: string) => {
		if (!scrollEl) return;
		const el = scrollEl.querySelector<HTMLElement>(`[data-message-id="${id}"]`);
		if (!el) return;
		el.scrollIntoView({ block: 'center', behavior: 'smooth' });
		if (highlightTimer !== null) clearTimeout(highlightTimer);
		setHighlightId(id);
		highlightTimer = window.setTimeout(() => {
			setHighlightId(null);
			highlightTimer = null;
		}, 1600);
	};

	const startReply = (msg: Message) => {
		setReplyingTo(msg);
		requestAnimationFrame(() => composerEl?.focus());
	};
	const cancelReply = () => setReplyingTo(null);

	createEffect(
		on(
			() => params().channelId,
			() => setReplyingTo(null),
			{ defer: true },
		),
	);

	onCleanup(() => {
		if (highlightTimer !== null) clearTimeout(highlightTimer);
	});

	const [inviteCode, setInviteCode] = createSignal<string | null>(null);
	const [inviteLoading, setInviteLoading] = createSignal(false);
	const [inviteError, setInviteError] = createSignal<string | null>(null);
	const [copied, setCopied] = createSignal(false);

	const generateInvite = async () => {
		const id = params().channelId;
		setInviteLoading(true);
		setInviteError(null);
		setCopied(false);
		try {
			const inv = await createChannelInvite(id);
			setInviteCode(inv?.code ?? null);
		} catch (err) {
			setInviteError(
				err instanceof ApiError
					? err.message
					: err instanceof Error
						? err.message
						: t('invite-failed'),
			);
		} finally {
			setInviteLoading(false);
		}
	};

	const closeInvite = () => {
		setInviteCode(null);
		setInviteError(null);
		setCopied(false);
	};

	const copyInvite = async () => {
		const c = inviteCode();
		if (!c) return;
		try {
			await navigator.clipboard.writeText(c);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore
		}
	};

	const [lastMsgId, setLastMsgId] = createSignal<string>('');
	const [sending, setSending] = createSignal(false);
	const [sendError, setSendError] = createSignal<string | null>(null);
	const [now, setNow] = createSignal(Date.now());

	const cooldown = createMemo(() => {
		if (isOwner()) return 0;
		const rl = channel()?.rateLimitPerUser ?? 0;
		if (!rl) return 0;
		const last = lastSentStore()[params().channelId] ?? 0;
		const elapsed = (now() - last) / 1000;
		return Math.max(0, Math.ceil(rl - elapsed));
	});

	createEffect(() => {
		if (cooldown() <= 0) return;
		const timer = window.setInterval(() => setNow(Date.now()), 250);
		onCleanup(() => clearInterval(timer));
	});

	const [editingId, setEditingId] = createSignal<string | null>(null);
	const [editDraft, setEditDraft] = createSignal('');
	const [deleteCandidate, setDeleteCandidate] = createSignal<DeleteCandidate | null>(null);
	const [deleteClosing, setDeleteClosing] = createSignal(false);
	const [deleteSubmitting, setDeleteSubmitting] = createSignal(false);
	let deleteCloseTimer: number | null = null;

	const [ctxMenu, setCtxMenu] = createSignal<CtxMenuState | null>(null);
	const [ctxClosing, setCtxClosing] = createSignal(false);
	let ctxCloseTimer: number | null = null;
	let ctxMenuEl: HTMLDivElement | undefined;

	const openCtxMenu = (e: MouseEvent, messageId: string, content: string, mine: boolean) => {
		e.preventDefault();
		if (ctxCloseTimer !== null) {
			clearTimeout(ctxCloseTimer);
			ctxCloseTimer = null;
		}
		const W = 208;
		const H = mine ? 296 : 204;
		const x = Math.max(8, Math.min(e.clientX, window.innerWidth - W - 8));
		const y = Math.max(8, Math.min(e.clientY, window.innerHeight - H - 8));
		setCtxClosing(false);
		setCtxMenu({ x, y, messageId, content, mine });
	};

	const closeCtxMenu = () => {
		if (!ctxMenu() || ctxClosing()) return;
		setCtxClosing(true);
		ctxCloseTimer = window.setTimeout(() => {
			setCtxMenu(null);
			setCtxClosing(false);
			ctxCloseTimer = null;
		}, ANIM_MS);
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// ignore
		}
	};

	createEffect(() => {
		if (!ctxMenu() || ctxClosing()) return;
		const onDown = (e: MouseEvent) => {
			if (!ctxMenuEl?.contains(e.target as Node)) closeCtxMenu();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeCtxMenu();
		};
		const onScrollClose = () => closeCtxMenu();
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		scrollEl?.addEventListener('scroll', onScrollClose);
		onCleanup(() => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
			scrollEl?.removeEventListener('scroll', onScrollClose);
		});
	});

	createEffect(
		on(
			() => params().channelId,
			() => {
				if (ctxMenu()) closeCtxMenu();
			},
			{ defer: true },
		),
	);

	const openDelete = (id: string, preview: string) => {
		if (deleteCloseTimer !== null) {
			clearTimeout(deleteCloseTimer);
			deleteCloseTimer = null;
		}
		setDeleteClosing(false);
		setDeleteCandidate({ id, preview });
	};

	const closeDelete = () => {
		if (!deleteCandidate() || deleteClosing() || deleteSubmitting()) return;
		setDeleteClosing(true);
		deleteCloseTimer = window.setTimeout(() => {
			setDeleteCandidate(null);
			setDeleteClosing(false);
			deleteCloseTimer = null;
		}, ANIM_MS);
	};
	let lastTypingAt = 0;

	const startEdit = (id: string, current: string) => {
		setEditingId(id);
		setEditDraft(current);
	};
	const cancelEdit = () => {
		setEditingId(null);
		setEditDraft('');
	};
	const saveEdit = async () => {
		const id = editingId();
		if (!id) return;
		const text = editDraft().trim();
		if (!text) return;
		try {
			const updated = await editMessage(params().channelId, id, text);
			if (updated?.id) updateLocalMessage(updated);
		} catch (err) {
			console.error('edit failed', err);
		}
		cancelEdit();
	};

	const confirmDelete = async () => {
		const c = deleteCandidate();
		if (!c) return;
		setDeleteSubmitting(true);
		try {
			await deleteMessage(params().channelId, c.id);
			removeLocalMessage(params().channelId, c.id);
			setDeleteSubmitting(false);
			closeDelete();
		} catch (err) {
			console.error('delete failed', err);
			setDeleteSubmitting(false);
		}
	};

	createEffect(() => {
		if (!deleteCandidate() || deleteClosing()) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeDelete();
		};
		document.addEventListener('keydown', handler);
		onCleanup(() => document.removeEventListener('keydown', handler));
	});

	const onDraftInput = (value: string) => {
		if (isVoiceChannel()) return;

		setDraft(value);
		if (!value.trim()) return;
		if (gatewayState() !== 'ready') return;
		const now = Date.now();
		if (now - lastTypingAt >= 1000) {
			lastTypingAt = now;
			sendTyping(params().channelId).catch(() => {});
		}
	};

	const onSend = async (e: Event) => {
		if (isVoiceChannel()) return;
		e.preventDefault();
		const text = draft().trim();
		if (!text || sending() || cooldown() > 0) return;
		const channelId = params().channelId;
		const nonce = lastMsgId() || `n-${Date.now()}`;
		const reply = replyingTo();
		setDraft('');
		setSending(true);
		setSendError(null);
		try {
			const payload: CreateMessageRequest = { content: text, nonce };
			if (reply) payload.messageReference = { messageId: reply.id };
			const msg = await createMessage(channelId, payload);
			if (msg?.id) {
				addMessage(msg);
				setLastMsgId(msg.id);
				if ((channel()?.rateLimitPerUser ?? 0) > 0) {
					recordSent(channelId);
					setNow(Date.now());
				}
				setReplyingTo(null);
			}
		} catch (err) {
			setSendError(
				err instanceof ApiError
					? err.message
					: err instanceof Error
						? err.message
						: t('app-send-failed'),
			);
			setDraft(text);
		} finally {
			setSending(false);
		}
	};

	const onReplyFromMenu = (id: string) => {
		const target = messages().find((x) => x.id === id);
		if (target) startReply(target);
	};

	const onCopyLink = (id: string) => {
		const link = `${window.location.origin}/app/${params().serverId}/${params().channelId}/${id}`;
		copyToClipboard(link);
	};

	return (
		<main
			class="relative flex-1 min-w-0 flex flex-col bg-white dark:bg-[#211e1b] overflow-hidden lg:my-3 lg:mx-3 lg:rounded-3xl lg:shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
			style={layout.contentStyle()}
		>
			<ChannelHeader
				channel={channel}
				onGenerateInvite={generateInvite}
				inviteLoading={inviteLoading}
			/>

			<InviteBanner
				code={inviteCode}
				error={inviteError}
				copied={copied}
				onCopy={copyInvite}
				onClose={closeInvite}
			/>

			<Show when={isVoiceChannel()}>
				<VoiceChannelView channelId={params().channelId} channelName={channel()?.name ?? ''} />
			</Show>

			<Show when={!isVoiceChannel()}>
				<div
					ref={scrollEl}
					onScroll={onScroll}
					class="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5"
				>
					<div class="min-h-full flex flex-col justify-end">
						<Show when={loadingOlder()}>
							<div class="text-center py-2 text-xs text-stone-400 italic font-display">
								{t('app-load-older')}
							</div>
						</Show>
						<Show when={loadingHistory() && messages().length === 0}>
							<div class="text-center py-20 text-stone-400 italic font-display">
								{t('app-loading')}
							</div>
						</Show>
						<Show
							when={messages().length > 0}
							fallback={
								<div class="text-center text-stone-400 py-20 font-display italic text-2xl">
									{t('app-empty-channel')}
								</div>
							}
						>
							<For each={messages()}>
								{(m, i) => (
									<MessageItem
										m={m}
										prev={() => messages()[i() - 1]}
										highlighted={() => highlightId() === m.id}
										editing={() => editingId() === m.id}
										editDraft={editDraft}
										setEditDraft={setEditDraft}
										saveEdit={saveEdit}
										cancelEdit={cancelEdit}
										onStartReply={startReply}
										onStartEdit={startEdit}
										onDelete={openDelete}
										onJumpToMessage={jumpToMessage}
										onContextMenu={openCtxMenu}
									/>
								)}
							</For>
						</Show>
					</div>
				</div>

				<JumpToBottomButton
					visible={() => !atBottom()}
					unread={unread}
					onClick={() => scrollToBottom(true)}
				/>

				<TypingIndicator text={typingText} />

				<SlowmodeIndicator channel={channel} cooldown={cooldown} isOwner={isOwner} />

				<Show when={sendError()}>
					<div class="px-4 sm:px-6 py-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
						<span>{sendError()}</span>
						<button
							onClick={() => setSendError(null)}
							class="ml-auto text-stone-400 hover:text-stone-700"
						>
							<i class="fa-solid fa-xmark" />
						</button>
					</div>
				</Show>

				<MessageComposer
					channel={channel}
					draft={draft}
					onDraftInput={onDraftInput}
					onSend={onSend}
					sending={sending}
					cooldown={cooldown}
					replyingTo={replyingTo}
					onCancelReply={cancelReply}
					composerRef={(el) => (composerEl = el)}
				/>

				<MessageContextMenu
					menu={ctxMenu}
					closing={ctxClosing}
					menuRef={(el) => (ctxMenuEl = el)}
					onReply={onReplyFromMenu}
					onCopyText={copyToClipboard}
					onCopyId={copyToClipboard}
					onCopyLink={onCopyLink}
					onEdit={startEdit}
					onDelete={openDelete}
					onClose={closeCtxMenu}
				/>

				<DeleteMessageDialog
					candidate={deleteCandidate}
					closing={deleteClosing}
					submitting={deleteSubmitting}
					onClose={closeDelete}
					onConfirm={confirmDelete}
				/>
			</Show>
		</main>
	);
}
