import { createFileRoute } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import { ApiError } from '../api/client';
import { createChannelInvite } from '../api/invites';
import { useChannel } from '../state/gateway-data';

export const Route = createFileRoute('/app/$serverId/$channelId')({
  component: ChannelView,
});

function ChannelView() {
  const params = Route.useParams();
  const channel = useChannel(() => params().serverId, () => params().channelId);
  const [draft, setDraft] = createSignal('');
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

  const onSend = (e: Event) => {
    e.preventDefault();
    const text = draft().trim();
    if (!text) return;
    // TODO: send via gateway dispatch (MESSAGE_CREATE)
    console.log('send', { channelId: params().channelId, text });
    setDraft('');
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

      <div class="flex-1 overflow-y-auto px-6 py-5">
        <div class="text-center text-stone-400 py-20 font-display italic text-2xl">
          no messages yet. start something.
        </div>
      </div>

      <form onSubmit={onSend} class="px-6 pb-5 pt-2 shrink-0">
        <div class="flex items-center gap-2 rounded-2xl bg-[#fdfaf3] dark:bg-stone-900 px-4 py-3 focus-within:bg-white dark:focus-within:bg-stone-800 transition-colors shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] focus-within:shadow-[inset_0_0_0_1.5px_#f7e26c]">
          <button
            type="button"
            class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-1"
            title="Attach"
          >
            <i class="fa-solid fa-paperclip" />
          </button>
          <input
            type="text"
            placeholder={`message ${channel()?.name ?? ''}…`}
            value={draft()}
            onInput={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) onSend(e);
            }}
            class="flex-1 bg-transparent outline-none text-sm placeholder:text-stone-400 placeholder:italic placeholder:font-display"
          />
          <button
            type="button"
            class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-1"
            title="Emoji"
          >
            <i class="fa-regular fa-face-smile" />
          </button>
          <button
            type="submit"
            class="px-3.5 py-1.5 rounded-xl bg-[#f7e26c] text-stone-900 text-xs font-medium hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow disabled:opacity-50 disabled:hover:shadow-none flex items-center gap-1.5"
            disabled={!draft().trim()}
          >
            <i class="fa-solid fa-paper-plane text-[0.7rem]" />
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
