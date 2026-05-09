import { useNavigate } from '@tanstack/solid-router';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { logout } from '../api/auth';
import { ApiError } from '../api/client';
import { disconnect, ready } from '../api/gateway';

type Section = 'account' | 'profile' | 'appearance' | 'danger';

type SectionDef = { id: Section; label: string; icon: string };

const SECTIONS: SectionDef[] = [
  { id: 'account', label: 'account', icon: 'fa-user' },
  { id: 'profile', label: 'profile', icon: 'fa-id-card' },
  { id: 'appearance', label: 'appearance', icon: 'fa-palette' },
  { id: 'danger', label: 'danger zone', icon: 'fa-triangle-exclamation' },
];

const inputClass =
  'w-full rounded-xl bg-[#fdfaf3] dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2.5 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-600';

export function SettingsModal(props: { onClose: () => void }) {
  const [section, setSection] = createSignal<Section>('account');
  const navigate = useNavigate();

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  });

  const r = ready;
  const me = () => r()?.user;
  const account = () => r()?.account;
  const settings = () => r()?.settings;

  const [bio, setBio] = createSignal('');
  const [avatar, setAvatar] = createSignal('');
  const [banner, setBanner] = createSignal('');
  const [theme, setTheme] = createSignal<'LIGHT' | 'DARK' | 'DIM'>('LIGHT');
  const [compact, setCompact] = createSignal(false);
  const [showAvatars, setShowAvatars] = createSignal(true);

  const [loggingOut, setLoggingOut] = createSignal(false);
  const [err, setErr] = createSignal<string | null>(null);

  // sync from ready data on mount
  const u = me();
  if (u) {
    setBio(u.bio ?? '');
    setAvatar(u.avatar ?? '');
    setBanner(u.banner ?? '');
  }
  const s = settings();
  if (s) {
    setTheme(s.theme);
    setCompact(s.compactMode);
    setShowAvatars(s.compactShowAvatars);
  }

  const onLogout = async () => {
    setErr(null);
    setLoggingOut(true);
    try {
      await logout();
      disconnect();
      navigate({ to: '/login' });
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Logout failed',
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 bg-[#fdfaf3] dark:bg-[#1a1816] flex animate-fade-in">
      <aside class="w-64 shrink-0 bg-[#f5efe1] dark:bg-[#211e1b] flex flex-col px-3 py-6 gap-1 border-r border-stone-200 dark:border-stone-800">
        <div class="px-3 mb-3">
          <h2 class="font-display text-2xl">settings</h2>
        </div>
        <For each={SECTIONS}>
          {(s) => (
            <button
              onClick={() => setSection(s.id)}
              class={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left ${
                section() === s.id
                  ? 'bg-[#f7e26c] text-stone-900 font-medium'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/40 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <i class={`fa-solid ${s.icon} w-4 text-center text-xs opacity-70`} />
              <span>{s.label}</span>
            </button>
          )}
        </For>
      </aside>

      <main class="flex-1 min-w-0 overflow-y-auto relative">
        <button
          onClick={props.onClose}
          class="absolute top-5 right-6 w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center"
          title="Close (esc)"
        >
          <i class="fa-solid fa-xmark" />
        </button>

        <div class="max-w-2xl mx-auto px-10 py-12">
          <Show when={section() === 'account'}>
            <h3 class="font-display text-3xl mb-1">account</h3>
            <p class="text-sm text-stone-500 italic font-display mb-8">
              your basic identity.
            </p>
            <Field label="username">
              <input class={inputClass} value={me()?.username ?? ''} readonly />
            </Field>
            <Field label="tag">
              <input class={inputClass} value={me()?.tag ?? ''} readonly />
            </Field>
            <Field label="email">
              <input class={inputClass} value={account()?.email ?? ''} readonly />
            </Field>
            <Field label="email verified">
              <input class={inputClass} value={account()?.emailVerified ?? '—'} readonly />
            </Field>
            <Field label="locale">
              <input class={inputClass} value={account()?.locale ?? ''} readonly />
            </Field>
            <Field label="user id">
              <input
                class={`${inputClass} font-mono text-xs`}
                value={me()?.id ?? ''}
                readonly
              />
            </Field>
          </Show>

          <Show when={section() === 'profile'}>
            <h3 class="font-display text-3xl mb-1">profile</h3>
            <p class="text-sm text-stone-500 italic font-display mb-8">
              what others see when they look you up.
            </p>
            <Field label="bio">
              <textarea
                rows={4}
                placeholder="say something about yourself"
                value={bio()}
                onInput={(e) => setBio(e.currentTarget.value)}
                class={`${inputClass} resize-none`}
              />
            </Field>
            <Field label="avatar url">
              <input
                type="url"
                placeholder="https://..."
                value={avatar()}
                onInput={(e) => setAvatar(e.currentTarget.value)}
                class={inputClass}
              />
            </Field>
            <Field label="banner url">
              <input
                type="url"
                placeholder="https://..."
                value={banner()}
                onInput={(e) => setBanner(e.currentTarget.value)}
                class={inputClass}
              />
            </Field>
            <div class="mt-6 flex gap-2">
              <button class="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#f7e26c] text-stone-900 hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow">
                save changes
              </button>
            </div>
          </Show>

          <Show when={section() === 'appearance'}>
            <h3 class="font-display text-3xl mb-1">appearance</h3>
            <p class="text-sm text-stone-500 italic font-display mb-8">
              tune how vanilla looks.
            </p>
            <Field label="theme">
              <div class="flex gap-2">
                <For each={['LIGHT', 'DIM', 'DARK'] as const}>
                  {(t) => (
                    <button
                      onClick={() => setTheme(t)}
                      class={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        theme() === t
                          ? 'bg-[#f7e26c] text-stone-900 border-[#f7e26c]'
                          : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {t.toLowerCase()}
                    </button>
                  )}
                </For>
              </div>
            </Field>
            <ToggleField
              label="compact mode"
              hint="denser message rows"
              value={compact()}
              onChange={setCompact}
            />
            <ToggleField
              label="show avatars in compact"
              hint="keep avatars visible even in compact mode"
              value={showAvatars()}
              onChange={setShowAvatars}
            />
            <div class="mt-6 flex gap-2">
              <button class="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#f7e26c] text-stone-900 hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow">
                save preferences
              </button>
            </div>
          </Show>

          <Show when={section() === 'danger'}>
            <h3 class="font-display text-3xl mb-1">danger zone</h3>
            <p class="text-sm text-stone-500 italic font-display mb-8">
              irreversible doors. mind your step.
            </p>

            <div class="rounded-xl border border-stone-200 dark:border-stone-800 p-5 mb-4">
              <h4 class="font-display text-lg mb-1">log out</h4>
              <p class="text-sm text-stone-500 mb-3">end your session on this device.</p>
              <button
                onClick={onLogout}
                disabled={loggingOut()}
                class="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-60"
              >
                {loggingOut() ? 'logging out…' : 'log out'}
              </button>
            </div>

            <div class="rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5">
              <h4 class="font-display text-lg text-red-700 dark:text-red-400 mb-1">
                delete account
              </h4>
              <p class="text-sm text-stone-500 mb-3">
                permanently remove your account and all data. cannot be undone.
              </p>
              <button class="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">
                delete account
              </button>
            </div>

            <Show when={err()}>
              <div class="mt-4 text-sm text-red-600 dark:text-red-400">{err()}</div>
            </Show>
          </Show>
        </div>
      </main>
    </div>
  );
}

function Field(props: { label: string; children: any }) {
  return (
    <div class="mb-5">
      <label class="block text-xs font-display italic text-stone-500 mb-1.5 px-1">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

function ToggleField(props: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div class="flex items-start justify-between py-3 border-t border-stone-100 dark:border-stone-800">
      <div class="flex-1 pr-6">
        <div class="text-sm font-medium">{props.label}</div>
        <Show when={props.hint}>
          <div class="text-xs text-stone-500 italic font-display mt-0.5">{props.hint}</div>
        </Show>
      </div>
      <button
        onClick={() => props.onChange(!props.value)}
        class={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          props.value ? 'bg-[#f7e26c]' : 'bg-stone-300 dark:bg-stone-700'
        }`}
      >
        <span
          class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: props.value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}
