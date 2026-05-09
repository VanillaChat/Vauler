import {
  createFileRoute,
  Link,
  Outlet,
  useMatch,
  useNavigate,
} from '@tanstack/solid-router';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { connect, disconnect, type GatewayUser } from '../api/gateway';
import { statusColors, statusLabels } from '../components/Avatar';
import { ProfileContext } from '../contexts/profile';
import { colorForId, guilds } from '../state/gateway-data';

export const Route = createFileRoute('/app')({
  component: AppLayout,
});

function AppLayout() {
  onMount(() => connect());
  onCleanup(() => disconnect());

  const navigate = useNavigate();
  const serverMatch = useMatch({
    from: '/app/$serverId',
    shouldThrow: false,
  });
  const currentServerId = createMemo<string | undefined>((prev) => {
    const id = serverMatch()?.params.serverId;
    return id ?? prev;
  });

  const [profileUser, setProfileUser] = createSignal<GatewayUser | null>(null);
  const [profilePos, setProfilePos] = createSignal({ x: 0, y: 0 });
  let popoverEl: HTMLDivElement | undefined;

  const openProfile = (
    user: GatewayUser,
    e: MouseEvent,
    preferRight = false,
    preferAbove = false,
  ) => {
    e.stopPropagation();
    const W = 288;
    const H = 380;
    const GAP = 12;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    let x: number;
    let y: number;

    if (preferAbove) {
      x = rect.left;
      y = rect.top - H - GAP;
      if (y < 8) y = rect.bottom + GAP;
    } else {
      if (preferRight) {
        x = rect.right + GAP;
        if (x + W > window.innerWidth - 8) x = rect.left - W - GAP;
      } else {
        x = rect.left - W - GAP;
        if (x < 8) x = rect.right + GAP;
      }
      y = rect.top + H <= window.innerHeight - 8 ? rect.top : rect.bottom - H;
    }

    x = Math.max(8, Math.min(x, window.innerWidth - W - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - H - 8));

    setProfilePos({ x, y });
    setProfileUser(user);
  };

  createEffect(() => {
    if (!profileUser()) return;
    const handler = (e: MouseEvent) => {
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        setProfileUser(null);
      }
    };
    document.addEventListener('mousedown', handler);
    onCleanup(() => document.removeEventListener('mousedown', handler));
  });

  const onPickServer = (id: string) => {
    const g = guilds().find((g) => g.id === id);
    const first = g?.channels[0];
    if (first) {
      navigate({
        to: '/app/$serverId/$channelId',
        params: { serverId: id, channelId: first.id },
        viewTransition: false,
      });
    } else {
      navigate({ to: '/app/$serverId', params: { serverId: id }, viewTransition: false });
    }
  };

  return (
    <ProfileContext.Provider value={{ open: openProfile }}>
      <div class="h-screen flex bg-[#fdfaf3] dark:bg-[#1a1816] text-stone-800 dark:text-stone-100 overflow-hidden">
        <nav class="w-[80px] shrink-0 flex flex-col items-center py-5 gap-3 overflow-y-auto">
          <Link to="/" class="block w-10 h-10 mb-1" aria-label="home">
            <span
              class="block w-10 h-10 bg-stone-900 dark:bg-stone-100"
              style={{
                mask: 'url(/VanillaMark.svg) center / contain no-repeat',
                '-webkit-mask': 'url(/VanillaMark.svg) center / contain no-repeat',
              }}
            />
          </Link>
          <div class="w-6 h-px bg-stone-300 dark:bg-stone-700 my-1" />
          <For each={guilds()}>
            {(g) => {
              const active = () => g.id === currentServerId();
              return (
                <button
                  onClick={() => onPickServer(g.id)}
                  class="group relative"
                  title={g.name}
                >
                  <Show when={active()}>
                    <span class="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-stone-900 dark:bg-stone-100" />
                  </Show>
                  <span
                    class="flex items-center justify-center w-12 h-12 rounded-2xl font-display text-stone-900 overflow-hidden"
                    classList={{
                      'shadow-[0_8px_22px_rgba(0,0,0,0.18)]': active(),
                      'opacity-55 shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:opacity-100 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]':
                        !active(),
                    }}
                    style={{ 'background-color': colorForId(g.id), 'font-size': '20px' }}
                  >
                    {g.icon ? (
                      <img src={g.icon} alt="" class="w-full h-full object-cover" />
                    ) : (
                      g.name[0]?.toUpperCase()
                    )}
                  </span>
                </button>
              );
            }}
          </For>
          <button
            class="w-12 h-12 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-400 hover:border-[#c9a942] hover:text-[#c9a942] hover:bg-[#f7e26c]/10 transition-colors flex items-center justify-center"
            title="Add server"
          >
            <i class="fa-solid fa-plus" />
          </button>
        </nav>

        <Outlet />

        <Show when={profileUser()}>
          {(u) => (
            <div
              ref={popoverEl}
              class="fixed z-50 w-72 rounded-2xl bg-white dark:bg-[#211e1b] shadow-2xl shadow-black/15 overflow-hidden border border-stone-200 dark:border-stone-800 animate-[fadeIn_0.15s_ease-out]"
              style={{
                left: `${profilePos().x}px`,
                top: `${profilePos().y}px`,
              }}
            >
              <div
                class="h-20"
                style={{
                  'background-color': colorForId(u().id),
                  ...(u().banner ? { 'background-image': `url(${u().banner})`, 'background-size': 'cover', 'background-position': 'center' } : {}),
                }}
              />
              <div class="px-5 -mt-10 pb-5">
                <div class="relative inline-flex">
                  <div
                    class="w-20 h-20 rounded-full flex items-center justify-center font-display text-stone-900 ring-4 ring-white dark:ring-[#211e1b] overflow-hidden"
                    style={{
                      'background-color': colorForId(u().id),
                      'font-size': '2rem',
                    }}
                  >
                    {u().avatar ? (
                      <img src={u().avatar!} alt="" class="w-full h-full object-cover" />
                    ) : (
                      u().username[0]?.toUpperCase()
                    )}
                  </div>
                  <span
                    class="absolute bottom-1 right-1 w-4 h-4 rounded-full ring-[3px] ring-white dark:ring-[#211e1b]"
                    style={{ 'background-color': statusColors[u().status] }}
                  />
                </div>
                <div class="mt-3 flex items-baseline gap-1">
                  <h3 class="font-display text-2xl">{u().username}</h3>
                  <span class="font-display text-base text-stone-400">/{u().tag}</span>
                  <Show when={u().bot}>
                    <span class="ml-1 px-1.5 py-0.5 rounded-md bg-stone-900 text-white text-[0.6rem] font-medium uppercase tracking-wider">
                      bot
                    </span>
                  </Show>
                </div>
                <div class="text-xs font-display italic text-stone-500 mt-0.5">
                  {statusLabels[u().status]}
                </div>

                <Show when={u().bio}>
                  <div class="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                    <div class="text-[0.7rem] uppercase tracking-wider text-stone-400 font-medium mb-1">
                      about
                    </div>
                    <p class="text-sm text-stone-600 dark:text-stone-400 italic font-display">
                      {u().bio}
                    </p>
                  </div>
                </Show>

                <div class="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <div class="text-[0.7rem] uppercase tracking-wider text-stone-400 font-medium mb-1">
                    member since
                  </div>
                  <p class="text-sm text-stone-600 dark:text-stone-400 font-display italic">
                    {new Date(u().createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div class="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <div class="text-[0.7rem] uppercase tracking-wider text-stone-400 font-medium mb-1">
                    id
                  </div>
                  <p class="font-mono text-xs text-stone-500 dark:text-stone-400 break-all">
                    {u().id}
                  </p>
                </div>

                <div class="mt-4 flex gap-2">
                  <button class="flex-1 px-3 py-2 rounded-xl bg-[#f7e26c] text-stone-900 text-sm font-medium hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow flex items-center justify-center gap-2">
                    <i class="fa-solid fa-paper-plane text-xs" />
                    Message
                  </button>
                  <button
                    class="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                    title="Add friend"
                  >
                    <i class="fa-solid fa-user-plus" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>
    </ProfileContext.Provider>
  );
}
