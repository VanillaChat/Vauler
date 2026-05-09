import { createFileRoute } from '@tanstack/solid-router';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { ApiError } from '../api/client';
import type { GatewayUser } from '../api/gateway';
import { createChannelInvite } from '../api/invites';
import { createMessage, fetchMessages, sendTyping } from '../api/messages';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../contexts/profile';
import { compactMode, useChannel, userPresence } from '../state/gateway-data';
import {
  addMessage,
  isChannelExhausted,
  isChannelLoaded,
  markChannelExhausted,
  markChannelLoaded,
  messageStore,
  prependMessages,
  setChannelMessages,
} from '../state/messages';
import { typingStore } from '../state/typing';

export const Route = createFileRoute('/app/$serverId/$channelId')({
  component: ChannelView,
});

function ChannelView() {
  const params = Route.useParams();
  const channel = useChannel(() => params().serverId, () => params().channelId);
  const profile = useProfile();
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
    if (list.length === 1) return `${list[0].username} is typing`;
    if (list.length === 2) return `${list[0].username} and ${list[1].username} are typing`;
    if (list.length === 3)
      return `${list[0].username}, ${list[1].username}, and ${list[2].username} are typing`;
    return 'several people are typing';
  });
  const [draft, setDraft] = createSignal('');
  const [loadingHistory, setLoadingHistory] = createSignal(false);
  const [loadingOlder, setLoadingOlder] = createSignal(false);
  let scrollEl: HTMLDivElement | undefined;

  const PAGE_SIZE = 50;

  const loadInitial = async (id: string) => {
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
    loadInitial(id);
  });

  // Auto-scroll to bottom on new message if user near bottom
  createEffect(() => {
    const list = messages();
    if (!list.length || !scrollEl) return;
    const nearBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 200;
    if (nearBottom) {
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
      });
    }
  });

  const onScroll = () => {
    if (!scrollEl) return;
    if (scrollEl.scrollTop < 120) loadOlder();
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
            : 'Failed to generate',
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
  let lastTypingAt = 0;

  const onDraftInput = (value: string) => {
    setDraft(value);
    if (!value.trim()) return;
    const now = Date.now();
    if (now - lastTypingAt >= 1000) {
      lastTypingAt = now;
      sendTyping(params().channelId).catch(() => {});
    }
  };

  const onSend = async (e: Event) => {
    e.preventDefault();
    const text = draft().trim();
    if (!text || sending()) return;
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
      }
    } catch (err) {
      setSendError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Send failed',
      );
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  return (
    <main class="flex-1 min-w-0 flex flex-col my-3 mr-2 bg-white dark:bg-[#211e1b] rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
      <header class="px-6 h-14 flex items-center gap-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
        <Show when={channel()} fallback={<span class="text-sm text-stone-400 italic font-display">channel not found</span>}>
          {(ch) => (
            <>
              <i class="fa-solid fa-hashtag text-stone-400 text-lg" />
              <h2 class="font-display text-2xl">{ch().name}</h2>
              <div class="flex-1" />
              <button
                onClick={generateInvite}
                disabled={inviteLoading()}
                class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
                title="Generate invite"
              >
                <i class="fa-solid fa-link" />
                <span class="hidden sm:inline font-display italic">invite</span>
              </button>
            </>
          )}
        </Show>
      </header>

      <Show when={inviteCode() || inviteError()}>
        <div class="px-6 py-3 border-b border-stone-100 dark:border-stone-800 bg-[#fdfaf3] dark:bg-stone-900/40">
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
                  {copied() ? 'copied' : 'copy'}
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
        class="flex-1 overflow-y-auto px-6 py-5"
      >
        <Show when={loadingOlder()}>
          <div class="text-center py-2 text-xs text-stone-400 italic font-display">
            loading older…
          </div>
        </Show>
        <Show when={loadingHistory() && messages().length === 0}>
          <div class="text-center py-20 text-stone-400 italic font-display">loading…</div>
        </Show>
        <Show
          when={messages().length > 0}
          fallback={
            <div class="text-center text-stone-400 py-20 font-display italic text-2xl">
              no messages yet. start something.
            </div>
          }
        >
          <For each={messages()}>
            {(m, i) => {
              const author = m.author;
              const displayName = author?.member?.nickname ?? author?.username ?? '?';
              const liveStatus = () =>
                userPresence(m.authorId) ?? author?.status ?? 'UNAVAILABLE';
              const avatarUser = () => ({
                id: m.authorId,
                username: author?.username ?? '?',
                status: liveStatus(),
                avatar: author?.avatar ?? null,
              });
              const profileUser = (): GatewayUser => ({
                id: m.authorId,
                username: author?.username ?? '?',
                tag: author?.tag ?? '',
                createdAt: new Date(0),
                bot: author?.bot ?? false,
                status: liveStatus(),
                flags: author?.flags ?? 0,
                bio: null,
                avatar: author?.avatar ?? null,
                banner: null,
                nickname: author?.member?.nickname ?? undefined,
              });
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
              return (
                <Show
                  when={isHead()}
                  fallback={
                    <div class="flex group hover:bg-[#f7e26c]/15 dark:hover:bg-stone-800/60 hover:shadow-[inset_3px_0_0_#f7e26c] -mx-3 px-3 py-0.5 rounded-md transition-all">
                      <span class="w-[50px] shrink-0 text-[0.65rem] text-stone-400 font-mono opacity-0 group-hover:opacity-100 self-center text-right pr-2">
                        {fullTime}
                      </span>
                      <div class="flex-1 min-w-0 text-stone-700 dark:text-stone-300 leading-relaxed text-[0.95rem] break-words whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  }
                >
                  <div class="flex gap-3 group hover:bg-[#f7e26c]/15 dark:hover:bg-stone-800/60 hover:shadow-[inset_3px_0_0_#f7e26c] -mx-3 px-3 py-2 mt-2 rounded-xl transition-all">
                    <button
                      onClick={(e) => profile.open(profileUser(), e, true)}
                      class="shrink-0"
                    >
                      <Avatar user={avatarUser()} size={38} />
                    </button>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-2">
                        <button
                          onClick={(e) => profile.open(profileUser(), e, true)}
                          class="font-display text-base hover:underline underline-offset-2"
                        >
                          {displayName}
                        </button>
                        <span class="text-xs text-stone-400 font-display italic">
                          {fullTime}
                        </span>
                      </div>
                      <div class="text-stone-700 dark:text-stone-300 leading-relaxed text-[0.95rem] break-words mt-0.5 whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  </div>
                </Show>
              );
            }}
          </For>
        </Show>
      </div>

      <Show when={typingText()}>
        <div class="px-6 pt-1 pb-0.5 text-xs text-stone-500 italic font-display flex items-center gap-2">
          <span class="inline-flex gap-0.5">
            <span class="typing-dot" />
            <span class="typing-dot" />
            <span class="typing-dot" />
          </span>
          <span>{typingText()}…</span>
        </div>
      </Show>

      <Show when={sendError()}>
        <div class="px-6 py-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <span>{sendError()}</span>
          <button
            onClick={() => setSendError(null)}
            class="ml-auto text-stone-400 hover:text-stone-700"
          >
            <i class="fa-solid fa-xmark" />
          </button>
        </div>
      </Show>

      <form onSubmit={onSend} class="px-6 pb-5 pt-2 shrink-0">
        <div class="flex items-stretch gap-2 rounded-2xl bg-[#fdfaf3] dark:bg-stone-900 px-3 py-2 focus-within:bg-white dark:focus-within:bg-stone-800 transition-colors shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] focus-within:shadow-[inset_0_0_0_1.5px_#f7e26c]">
          <button
            type="button"
            class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-2 self-start mt-2"
            title="Attach"
          >
            <i class="fa-solid fa-paperclip" />
          </button>
          <textarea
            placeholder={`message ${channel()?.name ?? ''}…`}
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
            title="Emoji"
          >
            <i class="fa-regular fa-face-smile" />
          </button>
          <button
            type="submit"
            class="self-end w-9 h-9 rounded-xl bg-[#f7e26c] text-stone-900 hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center shrink-0"
            disabled={!draft().trim() || sending()}
            title="Send"
          >
            <i class={sending() ? 'fa-solid fa-spinner fa-spin text-xs' : 'fa-solid fa-paper-plane text-xs'} />
          </button>
        </div>
      </form>
    </main>
  );
}
