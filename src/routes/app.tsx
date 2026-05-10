import {
  createFileRoute,
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
import {
  connect,
  gatewayState,
  updatePresence,
  type GatewayUser,
  type UserStatus,
} from '../api/gateway';
import { statusColors, statusLabels } from '../components/Avatar';
import { CreateChannelModal } from '../components/CreateChannelModal';
import { ServerChannelList } from '../components/ServerChannelList';
import { ServerModal } from '../components/ServerModal';
import { SettingsModal } from '../components/SettingsModal';
import { ProfileContext } from '../contexts/profile';
import { colorForId, currentUser, guilds } from '../state/gateway-data';
import { ready } from '../api/gateway';
import { t } from '../i18n';

export const Route = createFileRoute('/app')({
  component: AppLayout,
});

function AppLayout() {
  onMount(() => connect());
  // Intentionally not disconnecting on cleanup — keeps WS alive across HMR / route changes.
  // Disconnect only on explicit logout.

  const navigate = useNavigate();
  const serverMatch = useMatch({
    from: '/app/$serverId',
    shouldThrow: false,
  });
  const currentServerId = createMemo<string | undefined>((prev) => {
    const id = serverMatch()?.params.serverId;
    return id ?? prev;
  });
  const channelMatch = useMatch({
    from: '/app/$serverId/$channelId',
    shouldThrow: false,
  });
  const currentChannelId = createMemo<string | undefined>((prev) => {
    const id = channelMatch()?.params.channelId;
    return id ?? prev;
  });

  const [profileUser, setProfileUser] = createSignal<GatewayUser | null>(null);
  const [profilePos, setProfilePos] = createSignal({ x: 0, y: 0 });
  const [profilePinBottom, setProfilePinBottom] = createSignal<number | null>(null);
  const [profileOrigin, setProfileOrigin] = createSignal('top left');
  const [profileClosing, setProfileClosing] = createSignal(false);
  const [statusPickerOpen, setStatusPickerOpen] = createSignal(false);
  const [serverModalOpen, setServerModalOpen] = createSignal(false);
  const [serverModalClosing, setServerModalClosing] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [settingsClosing, setSettingsClosing] = createSignal(false);
  const [channelModalGuildId, setChannelModalGuildId] = createSignal<string | null>(null);
  const [channelModalClosing, setChannelModalClosing] = createSignal(false);
  let popoverEl: HTMLDivElement | undefined;

  const ANIM_MS = 130;
  let profileCloseTimer: number | null = null;

  const [connBarVisible, setConnBarVisible] = createSignal(
    gatewayState() !== 'ready',
  );
  const [connBarClosing, setConnBarClosing] = createSignal(false);
  let connBarTimer: number | null = null;

  createEffect(() => {
    const s = gatewayState();
    if (s !== 'ready') {
      if (connBarTimer !== null) {
        clearTimeout(connBarTimer);
        connBarTimer = null;
      }
      setConnBarClosing(false);
      setConnBarVisible(true);
    } else if (connBarVisible() && !connBarClosing()) {
      setConnBarClosing(true);
      connBarTimer = window.setTimeout(() => {
        setConnBarVisible(false);
        setConnBarClosing(false);
        connBarTimer = null;
      }, 200);
    }
  });

  const closeProfile = () => {
    if (!profileUser() || profileClosing()) return;
    setStatusPickerOpen(false);
    setProfileClosing(true);
    profileCloseTimer = window.setTimeout(() => {
      setProfileUser(null);
      setProfileClosing(false);
      profileCloseTimer = null;
    }, ANIM_MS);
  };

  const closeServerModal = () => {
    if (!serverModalOpen() || serverModalClosing()) return;
    setServerModalClosing(true);
    setTimeout(() => {
      setServerModalOpen(false);
      setServerModalClosing(false);
    }, ANIM_MS);
  };

  const closeSettings = () => {
    if (!settingsOpen() || settingsClosing()) return;
    setSettingsClosing(true);
    setTimeout(() => {
      setSettingsOpen(false);
      setSettingsClosing(false);
    }, ANIM_MS);
  };

  const closeChannelModal = () => {
    if (!channelModalGuildId() || channelModalClosing()) return;
    setChannelModalClosing(true);
    setTimeout(() => {
      setChannelModalGuildId(null);
      setChannelModalClosing(false);
    }, ANIM_MS);
  };

  const openProfile = (
    user: GatewayUser,
    e: MouseEvent,
    preferRight = false,
    preferAbove = false,
    centerX = false,
  ) => {
    e.stopPropagation();
    const W = 288;
    const H = 380;
    const GAP = 12;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    let x: number;
    let y: number;
    let originX: 'left' | 'right' | 'center';
    let originY: 'top' | 'bottom';

    let pinBottom: number | null = null;
    if (preferAbove) {
      if (centerX) {
        x = rect.left + rect.width / 2 - W / 2;
        originX = 'center';
      } else {
        x = rect.left;
        originX = 'left';
      }
      const above = rect.top - H - GAP;
      if (above >= 8) {
        pinBottom = window.innerHeight - rect.top + GAP;
        y = above;
        originY = 'bottom';
      } else {
        y = rect.bottom + GAP;
        originY = 'top';
      }
    } else {
      if (preferRight) {
        const right = rect.right + GAP;
        if (right + W <= window.innerWidth - 8) {
          x = right;
          originX = 'left';
        } else {
          x = rect.left - W - GAP;
          originX = 'right';
        }
      } else {
        const left = rect.left - W - GAP;
        if (left >= 8) {
          x = left;
          originX = 'right';
        } else {
          x = rect.right + GAP;
          originX = 'left';
        }
      }
      if (rect.top + H <= window.innerHeight - 8) {
        y = rect.top;
        originY = 'top';
      } else {
        y = rect.bottom - H;
        originY = 'bottom';
      }
    }

    x = Math.max(8, Math.min(x, window.innerWidth - W - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - H - 8));

    if (profileCloseTimer !== null) {
      clearTimeout(profileCloseTimer);
      profileCloseTimer = null;
    }
    setProfileClosing(false);
    setProfilePos({ x, y });
    setProfilePinBottom(pinBottom);
    setProfileOrigin(`${originY} ${originX}`);
    setStatusPickerOpen(false);
    setProfileUser(user);
  };

  const STATUSES: UserStatus[] = ['ONLINE', 'IDLE', 'DND', 'LOOKING_TO_PLAY', 'UNAVAILABLE'];

  const liveProfileUser = createMemo<GatewayUser | null>(() => {
    const u = profileUser();
    if (!u) return null;
    const me = currentUser();
    if (me?.id === u.id) return me;
    const r = ready();
    if (r) {
      const presenceStatus = r.presences?.find((p) => p.userId === u.id)?.status;
      for (const guild of r.guilds) {
        const m = guild.members?.find((mm) => mm.userId === u.id);
        if (m) return { ...m.user, status: presenceStatus ?? m.user.status };
      }
      if (presenceStatus) return { ...u, status: presenceStatus };
    }
    return u;
  });

  createEffect(() => {
    if (!profileUser() || profileClosing()) return;
    const handler = (e: MouseEvent) => {
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        closeProfile();
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
    <ProfileContext.Provider
      value={{
        open: openProfile,
        openSettings: () => {
          setSettingsClosing(false);
          setSettingsOpen(true);
        },
      }}
    >
      <div class="h-screen flex bg-[#fdfaf3] dark:bg-[#1a1816] text-stone-800 dark:text-stone-100 overflow-hidden">
        <Show when={connBarVisible()}>
          <div
            class={`fixed top-4 left-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-full bg-[#fdf6cc] dark:bg-[#3a3624] text-[#7a5a00] dark:text-[#e8d27a] border border-[#f0d96b]/60 dark:border-[#5a5028] shadow-lg shadow-black/10 backdrop-blur-sm text-sm font-medium ${
              connBarClosing() ? 'animate-slide-up-out' : 'animate-slide-down-in'
            }`}
            style={{ transform: 'translateX(-50%)' }}
          >
            <i class="fa-solid fa-circle-notch fa-spin text-xs" />
            <span>{t('app-connecting')}</span>
          </div>
        </Show>
        <ServerChannelList
          currentServerId={currentServerId}
          currentChannelId={currentChannelId}
          onPickServer={onPickServer}
          onAddServer={() => setServerModalOpen(true)}
          canAddChannel={(id) =>
            guilds().find((g) => g.id === id)?.ownerId === currentUser()?.id
          }
          onAddChannel={(id) => {
            setChannelModalClosing(false);
            setChannelModalGuildId(id);
          }}
          onOpenProfile={(user, e) => openProfile(user, e, false, true, true)}
          onOpenSettings={() => {
            setSettingsClosing(false);
            setSettingsOpen(true);
          }}
        />

        <Outlet />

        <Show when={serverModalOpen() || serverModalClosing()}>
          <ServerModal
            closing={serverModalClosing()}
            onClose={closeServerModal}
            onCreated={(id) =>
              navigate({
                to: '/app/$serverId',
                params: { serverId: id },
                viewTransition: false,
              })
            }
          />
        </Show>

        <Show when={settingsOpen() || settingsClosing()}>
          <SettingsModal closing={settingsClosing()} onClose={closeSettings} />
        </Show>

        <Show when={channelModalGuildId()}>
          {(guildId) => (
            <CreateChannelModal
              guildId={guildId()}
              closing={channelModalClosing()}
              onClose={closeChannelModal}
              onCreated={(c) =>
                navigate({
                  to: '/app/$serverId/$channelId',
                  params: { serverId: guildId(), channelId: c.id },
                  viewTransition: false,
                })
              }
            />
          )}
        </Show>

        <Show when={liveProfileUser()}>
          {(u) => (
            <div
              ref={popoverEl}
              class={`fixed z-50 w-72 rounded-2xl bg-white dark:bg-[#211e1b] shadow-2xl shadow-black/15 overflow-hidden border border-stone-200 dark:border-stone-800 ${
                profileClosing() ? 'animate-popover-out' : 'animate-popover-in'
              }`}
              style={{
                left: `${profilePos().x}px`,
                ...(profilePinBottom() !== null
                  ? { bottom: `${profilePinBottom()}px` }
                  : { top: `${profilePos().y}px` }),
                'transform-origin': profileOrigin(),
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
                <Show
                  when={u().id === currentUser()?.id}
                  fallback={
                    <div class="text-xs font-display italic text-stone-500 mt-0.5">
                      {statusLabels[u().status]}
                    </div>
                  }
                >
                  <div class="relative mt-1">
                    <button
                      onClick={() => setStatusPickerOpen(!statusPickerOpen())}
                      class="flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 text-xs font-display italic text-stone-500"
                    >
                      <span
                        class="w-2 h-2 rounded-full"
                        style={{ 'background-color': statusColors[u().status] }}
                      />
                      <span>{statusLabels[u().status]}</span>
                      <i class="fa-solid fa-chevron-down text-[0.55rem] opacity-60" />
                    </button>
                    <Show when={statusPickerOpen()}>
                      <div class="absolute left-0 top-full mt-1 w-52 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-stone-800 shadow-xl shadow-black/10 p-1 z-10">
                        <For each={STATUSES}>
                          {(s) => (
                            <button
                              onClick={() => {
                                updatePresence(s);
                                setStatusPickerOpen(false);
                              }}
                              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left"
                            >
                              <span
                                class="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ 'background-color': statusColors[s] }}
                              />
                              <span class="flex-1">{statusLabels[s]}</span>
                              <Show when={s === u().status}>
                                <i class="fa-solid fa-check text-xs text-stone-500" />
                              </Show>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>

                <Show when={u().bio}>
                  <div class="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                    <div class="text-[0.7rem] uppercase tracking-wider text-stone-400 font-medium mb-1">
                      {t('profile-about')}
                    </div>
                    <p class="text-sm text-stone-600 dark:text-stone-400 italic font-display">
                      {u().bio}
                    </p>
                  </div>
                </Show>

                <div class="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <div class="text-[0.7rem] uppercase tracking-wider text-stone-400 font-medium mb-1">
                    {t('profile-member-since')}
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
                    {t('profile-id')}
                  </div>
                  <p class="font-mono text-xs text-stone-500 dark:text-stone-400 break-all">
                    {u().id}
                  </p>
                </div>

                <div class="mt-4 flex gap-2">
                  <button class="flex-1 px-3 py-2 rounded-xl bg-[#f7e26c] text-stone-900 text-sm font-medium hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow flex items-center justify-center gap-2">
                    <i class="fa-solid fa-paper-plane text-xs" />
                    {t('profile-message')}
                  </button>
                  <button
                    class="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                    title={t('profile-add-friend')}
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
