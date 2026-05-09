import { createSignal, Show } from 'solid-js';
import { ApiError } from '../api/client';
import { addGuild } from '../api/gateway';
import { createServer, joinServer } from '../api/servers';

type Tab = 'create' | 'join';

const inputClass =
  'w-full rounded-xl bg-[#fdfaf3] dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-600';

export function ServerModal(props: {
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [tab, setTab] = createSignal<Tab>('create');
  const [name, setName] = createSignal('');
  const [brief, setBrief] = createSignal('');
  const [code, setCode] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result =
        tab() === 'create'
          ? await createServer({ name: name(), brief: brief().trim() || undefined })
          : await joinServer({ inviteCode: code() });
      if (result?.guild?.id) {
        const g = result.guild;
        addGuild({
          ...g,
          channels: g.channels ?? result.channels ?? [],
          members: g.members ?? [],
        } as Parameters<typeof addGuild>[0]);
        props.onCreated?.(g.id);
      }
      props.onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-display rounded-xl ${
      active
        ? 'bg-[#f7e26c] text-stone-900 font-medium'
        : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
    }`;

  return (
    <>
      <div
        class="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm animate-fade-in"
        onClick={props.onClose}
      />
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="pointer-events-auto w-full max-w-md rounded-3xl bg-white dark:bg-[#211e1b] shadow-2xl shadow-black/15 overflow-hidden animate-popover-in">
          <div class="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800">
            <h2 class="font-display text-3xl">a new server</h2>
            <p class="text-sm text-stone-500 italic font-display mt-1">
              start one or hop into a friend's.
            </p>
          </div>

          <div class="px-6 pt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTab('create')}
              class={tabClass(tab() === 'create')}
            >
              create
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              class={tabClass(tab() === 'join')}
            >
              join
            </button>
          </div>

          <form onSubmit={onSubmit} class="p-6 space-y-3">
            <Show
              when={tab() === 'create'}
              fallback={
                <>
                  <label class="block text-xs font-display italic text-stone-500 px-1">
                    invite code
                  </label>
                  <input
                    type="text"
                    placeholder="paste an invite code"
                    required
                    value={code()}
                    onInput={(e) => setCode(e.currentTarget.value)}
                    class={inputClass}
                  />
                </>
              }
            >
              <label class="block text-xs font-display italic text-stone-500 px-1">
                server name
              </label>
              <input
                type="text"
                placeholder="my cozy room"
                required
                maxLength={100}
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class={inputClass}
              />
              <label class="block text-xs font-display italic text-stone-500 px-1 pt-2">
                brief <span class="text-stone-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="what's this place about?"
                maxLength={200}
                value={brief()}
                onInput={(e) => setBrief(e.currentTarget.value)}
                class={inputClass}
              />
            </Show>

            <Show when={error()}>
              <div class="text-sm text-red-600 dark:text-red-400 pt-1">{error()}</div>
            </Show>

            <div class="flex gap-2 pt-3">
              <button
                type="button"
                onClick={props.onClose}
                class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={submitting()}
                class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#f7e26c] text-stone-900 hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting() ? '…' : tab() === 'create' ? 'create' : 'join'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
