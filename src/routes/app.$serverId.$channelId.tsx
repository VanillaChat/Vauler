import { createFileRoute } from '@tanstack/solid-router';
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { ApiError } from '../api/client';
import { gatewayState, type GatewayUser } from '../api/gateway';
import { createChannelInvite } from '../api/invites';
import {
  createMessage,
  deleteMessage,
  editMessage,
  fetchMessages,
  sendTyping,
} from '../api/messages';
import { Avatar } from '../components/Avatar';
import { useLayout } from '../contexts/layout';
import { useProfile } from '../contexts/profile';
import { t } from '../i18n';
import {
  compactMode,
  currentUser,
  getUser,
  useChannel,
  useGuild,
  userPresence,
} from '../state/gateway-data';
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

const formatCooldown = (s: number) => {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
};

function ChannelView() {
  const params = Route.useParams();
  const channel = useChannel(() => params().serverId, () => params().channelId);
  const guild = useGuild(() => params().serverId);
  const isOwner = () => guild()?.ownerId === currentUser()?.id;
  const profile = useProfile();
  const layout = useLayout();
  const messages = createMemo(() => {
    const list = messageStore()[params().channelId] ?? [];
    return [...list].sort(
      (a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)),
    );
  });
  const typing = createMemo(() => typingStore()[params().channelId] ?? []);
  const typingText = createMemo(() => {
    const list = typing();
    if (list.length === 0) return null;
    if (list.length === 1) return t('typing-one', { name: list[0].username });
    if (list.length === 2)
      return t('typing-two', { a: list[0].username, b: list[1].username });
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
  let scrollEl: HTMLDivElement | undefined;

  const PAGE_SIZE = 50;

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
    const near =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 80;
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
  const [deleteCandidate, setDeleteCandidate] = createSignal<{
    id: string;
    preview: string;
  } | null>(null);
  const [deleteClosing, setDeleteClosing] = createSignal(false);
  const [deleteSubmitting, setDeleteSubmitting] = createSignal(false);
  let deleteCloseTimer: number | null = null;
  const ANIM_MS = 130;

  const [ctxMenu, setCtxMenu] = createSignal<{
    x: number;
    y: number;
    messageId: string;
    content: string;
    mine: boolean;
  } | null>(null);
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
    const H = mine ? 248 : 156;
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
      if (!ctxMenuEl || !ctxMenuEl.contains(e.target as Node)) closeCtxMenu();
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
  const onDelete = (id: string, preview: string) => {
    openDelete(id, preview);
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
    e.preventDefault();
    const text = draft().trim();
    if (!text || sending() || cooldown() > 0) return;
    const channelId = params().channelId;
    const nonce = lastMsgId() || `n-${Date.now()}`;
    setDraft('');
    setSending(true);
    setSendError(null);
    try {
      const msg = await createMessage(channelId, { content: text, nonce });
      if (msg?.id) {
        addMessage(msg);
        setLastMsgId(msg.id);
        if ((channel()?.rateLimitPerUser ?? 0) > 0) {
          recordSent(channelId);
          setNow(Date.now());
        }
      }
    } catch (err) {
      setSendError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('app-send-failed'),
      );
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  return (
    <main
      class="relative flex-1 min-w-0 flex flex-col my-2 mx-2 sm:my-3 sm:mr-2 sm:ml-0 bg-white dark:bg-[#211e1b] rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden"
      style={layout.contentStyle()}
    >
      <header class="px-4 sm:px-6 h-14 flex items-center gap-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
        <button
          type="button"
          onClick={() => layout.toggleSidebar()}
          class="lg:hidden -ml-1 w-9 h-9 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 flex items-center justify-center shrink-0"
          aria-label={t('app-open-menu')}
        >
          <i class="fa-solid fa-bars text-base" />
        </button>
        <Show when={channel()} fallback={<span class="text-sm text-stone-400 italic font-display">{t('app-channel-not-found')}</span>}>
          {(ch) => (
            <>
              <i class="fa-solid fa-hashtag text-stone-400 text-lg" />
              <h2 class="font-display text-xl sm:text-2xl truncate min-w-0">{ch().name}</h2>
              <div class="flex-1" />
              <button
                onClick={generateInvite}
                disabled={inviteLoading()}
                class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
                title={t('invite-button')}
              >
                <i class="fa-solid fa-link" />
                <span class="hidden sm:inline font-display italic">{t('invite-button')}</span>
              </button>
              <button
                type="button"
                onClick={() => layout.toggleMembers()}
                class="lg:hidden w-9 h-9 -mr-1 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 flex items-center justify-center shrink-0"
                aria-label={t('members-room')}
                title={t('members-room')}
              >
                <i class="fa-solid fa-users text-sm" />
              </button>
            </>
          )}
        </Show>
      </header>

      <Show when={inviteCode() || inviteError()}>
        <div class="px-4 sm:px-6 py-3 border-b border-stone-100 dark:border-stone-800 bg-[#fdfaf3] dark:bg-stone-900/40">
          <Show when={inviteCode()}>
            {(c) => (
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-link text-stone-400" />
                <code class="flex-1 font-mono text-sm text-stone-700 dark:text-stone-200 truncate">
                  {c()}
                </code>
                <button
                  onClick={copyInvite}
                  class="px-3 py-1.5 rounded-lg bg-[#f7e26c] text-stone-900 text-xs font-medium hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow flex items-center gap-1.5"
                >
                  <i class={copied() ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
                  {copied() ? t('invite-copied') : t('invite-copy')}
                </button>
                <button
                  onClick={closeInvite}
                  class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title="Dismiss"
                >
                  <i class="fa-solid fa-xmark" />
                </button>
              </div>
            )}
          </Show>
          <Show when={inviteError()}>
            <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span>{inviteError()}</span>
              <button
                onClick={closeInvite}
                class="ml-auto text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <i class="fa-solid fa-xmark" />
              </button>
            </div>
          </Show>
        </div>
      </Show>

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
          <div class="text-center py-20 text-stone-400 italic font-display">{t('app-loading')}</div>
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
            {(m, i) => {
              const author = m.author;
              const cachedUser = () => getUser(m.authorId);
              const displayName = () =>
                author?.member?.nickname ?? cachedUser()?.username ?? author?.username ?? '?';
              const liveStatus = () => userPresence(m.authorId) ?? 'UNAVAILABLE';
              const avatarUser = () => ({
                id: m.authorId,
                username: cachedUser()?.username ?? author?.username ?? '?',
                avatar: cachedUser()?.avatar ?? author?.avatar ?? null,
              });
              const profileUser = (): GatewayUser =>
                cachedUser() ?? {
                  id: m.authorId,
                  username: author?.username ?? '?',
                  tag: author?.tag ?? '',
                  createdAt: new Date(0),
                  bot: author?.bot ?? false,
                  flags: author?.flags ?? 0,
                  bio: null,
                  avatar: author?.avatar ?? null,
                  banner: null,
                };
              const fullTime = new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isHead = createMemo(() => {
                const prev = messages()[i() - 1];
                if (!prev) return true;
                if (compactMode()) return false;
                if (prev.authorId !== m.authorId) return true;
                return (
                  Number(new Date(m.createdAt)) - Number(new Date(prev.createdAt)) >
                  5 * 60 * 1000
                );
              });
              const isMine = () => m.authorId === currentUser()?.id;
              const isEditing = () => editingId() === m.id;

              const Toolbar = () => (
                <Show when={isMine() && !isEditing()}>
                  <div class="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-md overflow-hidden z-10">
                    <button
                      type="button"
                      onClick={() => startEdit(m.id, m.content)}
                      class="w-8 h-8 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
                      title={t('context-edit')}
                    >
                      <i class="fa-solid fa-pen text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m.id, m.content)}
                      class="w-8 h-8 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border-l border-stone-200 dark:border-stone-700"
                      title={t('context-delete')}
                    >
                      <i class="fa-solid fa-trash text-xs" />
                    </button>
                  </div>
                </Show>
              );

              const Content = () => (
                <Show when={isEditing()} fallback={m.content}>
                  <div>
                    <textarea
                      value={editDraft()}
                      onInput={(e) => setEditDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      rows={2}
                      class="w-full rounded-lg bg-[#fdfaf3] dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-3 py-2 text-sm outline-none focus:border-[#f7e26c] resize-none"
                    />
                    <div class="flex gap-3 text-xs text-stone-500 mt-1 italic font-display">
                      <span>
                        {t('edit-hint')}{' '}
                        <button
                          type="button"
                          onClick={cancelEdit}
                          class="underline hover:text-stone-800 dark:hover:text-stone-200"
                        >
                          {t('edit-cancel')}
                        </button>
                      </span>
                    </div>
                  </div>
                </Show>
              );

              return (
                <Show
                  when={isHead()}
                  fallback={
                    <div
                      class="relative flex group hover:bg-[#f7e26c]/15 dark:hover:bg-stone-800/60 hover:shadow-[inset_3px_0_0_#f7e26c] -mx-3 px-3 py-0.5 rounded-md transition-all"
                      onContextMenu={(e) => openCtxMenu(e, m.id, m.content, isMine())}
                    >
                      <Toolbar />
                      <span class="w-[50px] shrink-0 text-[0.65rem] text-stone-400 font-mono opacity-0 group-hover:opacity-100 self-center text-right pr-2">
                        {fullTime}
                      </span>
                      <div class="flex-1 min-w-0 text-stone-700 dark:text-stone-300 leading-relaxed text-[0.95rem] break-words whitespace-pre-wrap">
                        <Content />
                      </div>
                    </div>
                  }
                >
                  <div
                    class="relative flex gap-3 group hover:bg-[#f7e26c]/15 dark:hover:bg-stone-800/60 hover:shadow-[inset_3px_0_0_#f7e26c] -mx-3 px-3 py-2 mt-2 rounded-xl transition-all"
                    onContextMenu={(e) => openCtxMenu(e, m.id, m.content, isMine())}
                  >
                    <Toolbar />
                    <button
                      onClick={(e) => profile.open(profileUser(), e, true)}
                      class="shrink-0"
                    >
                      <Avatar user={avatarUser()} status={liveStatus()} size={38} />
                    </button>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-2">
                        <button
                          onClick={(e) => profile.open(profileUser(), e, true)}
                          class="font-display text-base hover:underline underline-offset-2"
                        >
                          {displayName()}
                        </button>
                        <span class="text-xs text-stone-400 font-display italic">
                          {fullTime}
                        </span>
                      </div>
                      <div class="text-stone-700 dark:text-stone-300 leading-relaxed text-[0.95rem] break-words mt-0.5 whitespace-pre-wrap">
                        <Content />
                      </div>
                    </div>
                  </div>
                </Show>
              );
            }}
          </For>
        </Show>
        </div>
      </div>

      <Show when={!atBottom()}>
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          class="absolute right-4 sm:right-6 bottom-20 sm:bottom-24 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-stone-800 shadow-lg shadow-black/15 text-stone-600 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 animate-fade-in"
          title={t('app-jump-to-present')}
        >
          <i class="fa-solid fa-arrow-down text-xs" />
          <Show when={unread() > 0}>
            <span class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-[#f7e26c] text-stone-900 min-w-5 text-center">
              {unread() > 99 ? '99+' : unread()}
            </span>
          </Show>
        </button>
      </Show>

      <Show when={typingText()}>
        <div class="px-4 sm:px-6 pt-1 pb-0.5 text-xs text-stone-500 italic font-display flex items-center gap-2">
          <span class="inline-flex gap-0.5">
            <span class="typing-dot" />
            <span class="typing-dot" />
            <span class="typing-dot" />
          </span>
          <span>{typingText()}…</span>
        </div>
      </Show>

      <Show when={(channel()?.rateLimitPerUser ?? 0) > 0}>
        <div class="px-4 sm:px-6 pt-1 pb-0.5 flex items-center gap-1.5 text-xs text-stone-500">
          <i
            class="fa-solid fa-stopwatch text-[#a37b00] dark:text-[#f7e26c]"
            classList={{ 'animate-pulse': cooldown() > 0 }}
          />
          <span
            class="tabular-nums font-mono opacity-60"
            classList={{ 'line-through': isOwner() }}
            title={isOwner() ? t('slowmode-bypassed') : undefined}
          >
            {formatCooldown(channel()!.rateLimitPerUser!)}
          </span>
          <Show when={!isOwner()}>
            <span
              class="tabular-nums font-mono text-stone-700 dark:text-stone-200 transition-opacity duration-200"
              classList={{ 'opacity-100': cooldown() > 0, 'opacity-0': cooldown() === 0 }}
            >
              · {t('slowmode-left', { time: formatCooldown(Math.max(cooldown(), 1)) })}
            </span>
          </Show>
        </div>
      </Show>

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

      <form onSubmit={onSend} class="px-3 sm:px-6 pb-3 sm:pb-5 pt-2 shrink-0">
        <div class="flex items-stretch gap-2 rounded-2xl bg-[#fdfaf3] dark:bg-stone-900 px-3 py-2 focus-within:bg-white dark:focus-within:bg-stone-800 transition-colors shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] focus-within:shadow-[inset_0_0_0_1.5px_#f7e26c]">
          <button
            type="button"
            class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-2 self-start mt-2"
            title={t('composer-attach')}
          >
            <i class="fa-solid fa-paperclip" />
          </button>
          <textarea
            placeholder={t('composer-placeholder', { name: channel()?.name ?? '' })}
            value={draft()}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(200, el.scrollHeight) + 'px';
              onDraftInput(el.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend(e);
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
            disabled={!draft().trim() || sending() || cooldown() > 0}
            title={
              cooldown() > 0
                ? t('slowmode-left', { time: formatCooldown(cooldown()) })
                : t('composer-send')
            }
          >
            <i
              class={
                cooldown() > 0
                  ? 'fa-solid fa-stopwatch text-xs'
                  : sending()
                    ? 'fa-solid fa-spinner fa-spin text-xs'
                    : 'fa-solid fa-paper-plane text-xs'
              }
            />
          </button>
        </div>
      </form>

      <Show when={ctxMenu()}>
        {(menu) => (
          <Portal>
          <div
            ref={ctxMenuEl}
            class={`fixed z-50 w-52 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-stone-800 shadow-xl shadow-black/15 p-1 ${
              ctxClosing() ? 'animate-popover-out' : 'animate-popover-in'
            }`}
            style={{
              left: `${menu().x}px`,
              top: `${menu().y}px`,
              'transform-origin': 'top left',
            }}
          >
            <button
              type="button"
              onClick={() => {
                copyToClipboard(menu().content);
                closeCtxMenu();
              }}
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left text-stone-700 dark:text-stone-200"
            >
              <i class="fa-regular fa-copy text-xs w-4 text-stone-500" />
              <span>{t('context-copy-text')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(menu().messageId);
                closeCtxMenu();
              }}
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left text-stone-700 dark:text-stone-200"
            >
              <i class="fa-solid fa-hashtag text-xs w-4 text-stone-500" />
              <span>{t('context-copy-id')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/app/${params().serverId}/${params().channelId}/${menu().messageId}`;
                copyToClipboard(link);
                closeCtxMenu();
              }}
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left text-stone-700 dark:text-stone-200"
            >
              <i class="fa-solid fa-link text-xs w-4 text-stone-500" />
              <span>{t('context-copy-link')}</span>
            </button>
            <Show when={menu().mine}>
              <div class="my-1 h-px bg-stone-100 dark:bg-stone-800" />
              <button
                type="button"
                onClick={() => {
                  startEdit(menu().messageId, menu().content);
                  closeCtxMenu();
                }}
                class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left text-stone-700 dark:text-stone-200"
              >
                <i class="fa-solid fa-pen text-xs w-4 text-stone-500" />
                <span>{t('context-edit')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = menu().messageId;
                  const content = menu().content;
                  closeCtxMenu();
                  onDelete(id, content);
                }}
                class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-left"
              >
                <i class="fa-solid fa-trash text-xs w-4" />
                <span>{t('context-delete')}</span>
              </button>
            </Show>
          </div>
          </Portal>
        )}
      </Show>

      <Show when={deleteCandidate()}>
        {(c) => (
          <Portal>
            <div
              class={`fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm ${
                deleteClosing() ? 'animate-fade-out' : 'animate-fade-in'
              }`}
              onClick={() => !deleteSubmitting() && closeDelete()}
            />
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div
                class={`pointer-events-auto w-full max-w-md rounded-3xl bg-white dark:bg-[#211e1b] shadow-2xl shadow-black/15 overflow-hidden ${
                  deleteClosing() ? 'animate-popover-out' : 'animate-popover-in'
                }`}
              >
                <div class="px-6 pt-6 pb-2">
                  <h2 class="font-display text-2xl">{t('delete-title')}</h2>
                  <p class="text-sm text-stone-500 italic font-display mt-1">
                    {t('delete-sub')}
                  </p>
                </div>
                <div class="mx-6 my-4 rounded-xl bg-[#fdfaf3] dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {c().preview}
                </div>
                <div class="px-6 pb-6 pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={closeDelete}
                    disabled={deleteSubmitting()}
                    class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-100 transition-colors disabled:opacity-60"
                  >
                    {t('delete-cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={deleteSubmitting()}
                    class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleteSubmitting() ? t('delete-confirming') : t('delete-confirm')}
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </main>
  );
}
