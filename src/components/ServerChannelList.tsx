import { Link } from '@tanstack/solid-router';
import { createMemo, createSignal, For, Show } from 'solid-js';
import type { GatewayUser } from '../api/gateway';
import { Avatar, statusColors, statusLabels } from './Avatar';
import { useLayout } from '../contexts/layout';
import { t } from '../i18n';
import { colorForId, currentUser, guilds } from '../state/gateway-data';

interface Props {
  currentServerId: () => string | undefined;
  currentChannelId: () => string | undefined;
  onPickServer: (id: string) => void;
  onAddServer?: () => void;
  onAddChannel?: (guildId: string) => void;
  canAddChannel?: (guildId: string) => boolean;
  onOpenProfile?: (user: GatewayUser, e: MouseEvent) => void;
  onOpenSettings?: () => void;
}

export function ServerChannelList(props: Props) {
  const layout = useLayout();
  const [overrides, setOverrides] = createSignal<Record<string, boolean>>({});

  const isExpanded = (id: string) => {
    const o = overrides();
    if (id in o) return o[id];
    return id === props.currentServerId();
  };

  const toggle = (id: string) => {
    setOverrides({ ...overrides(), [id]: !isExpanded(id) });
  };

  return (
    <aside
      class="w-72 max-w-[85vw] shrink-0 bg-[#f5efe1] dark:bg-[#211e1b] flex flex-col rounded-3xl my-3 ml-3 mr-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden fixed inset-y-0 left-0 z-40 lg:relative lg:transform-none"
      style={layout.leftStyle()}
    >
      <Link
        to="/"
        class="px-7 pt-7 pb-6 flex items-center shrink-0"
        aria-label="vanilla"
      >
        <span
          class="block h-6 w-[111px] bg-stone-900 dark:bg-stone-100"
          style={{
            mask: 'url(/VanillaLogo.svg) left center / contain no-repeat',
            '-webkit-mask': 'url(/VanillaLogo.svg) left center / contain no-repeat',
          }}
        />
      </Link>

      <div class="px-3 pb-3 shrink-0">
        <button
          type="button"
          onClick={props.onAddServer}
          class="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#f7e26c] text-stone-900 font-medium hover:shadow-md hover:shadow-[#f7e26c]/40 transition-shadow"
        >
          <i class="fa-solid fa-plus text-sm" />
          <span>{t('app-new-community')}</span>
        </button>
      </div>

      <nav class="px-3 pb-3 space-y-0.5 shrink-0">
        <SidebarNavItem icon="fa-house" label={t('app-nav-home')} />
        <SidebarNavItem icon="fa-at" label={t('app-nav-mentions')} />
        <SidebarNavItem icon="fa-inbox" label={t('app-nav-inbox')} />
      </nav>

      <div class="px-5 pb-2 flex items-center justify-between shrink-0">
        <span class="text-xs font-display italic text-stone-500">
          {t('app-communities')}
        </span>
        <Show when={props.onAddServer}>
          <button
            type="button"
            onClick={props.onAddServer}
            class="w-5 h-5 rounded-md flex items-center justify-center text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            title={t('app-add-server')}
          >
            <i class="fa-solid fa-plus text-[0.65rem]" />
          </button>
        </Show>
      </div>

      <div class="flex-1 overflow-y-auto px-2 pb-3 space-y-1 min-h-0">
        <For each={guilds()}>
          {(g) => {
            const active = () => g.id === props.currentServerId();
            const expanded = () => isExpanded(g.id);
            return (
              <div
                class="rounded-2xl transition-colors"
                classList={{
                  'bg-[#e6d8a8] dark:bg-[#2c2724] shadow-inner shadow-black/[0.04] dark:shadow-black/20':
                    expanded(),
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!expanded() && !active()) props.onPickServer(g.id);
                    toggle(g.id);
                  }}
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors"
                  classList={{
                    'hover:bg-[#ece4cf] dark:hover:bg-stone-800/40': !expanded(),
                  }}
                  title={g.name}
                >
                  <span
                    class="flex items-center justify-center w-7 h-7 rounded-lg font-display text-stone-900 overflow-hidden shrink-0 text-sm"
                    style={{ 'background-color': colorForId(g.id) }}
                  >
                    {g.icon ? (
                      <img src={g.icon} alt="" class="w-full h-full object-cover" />
                    ) : (
                      g.name[0]?.toUpperCase()
                    )}
                  </span>
                  <span class="flex-1 truncate font-display text-base text-stone-800 dark:text-stone-100">
                    {g.name}
                  </span>
                  <i
                    class="fa-solid fa-chevron-down text-[0.6rem] text-stone-400 transition-transform shrink-0"
                    classList={{ 'rotate-180': expanded() }}
                  />
                </button>
                <Show when={expanded()}>
                  <div class="pb-2 px-2 space-y-0.5">
                    <For each={g.channels}>
                      {(c) => {
                        const isActiveCh = createMemo(
                          () =>
                            c.id === props.currentChannelId() &&
                            g.id === props.currentServerId(),
                        );
                        return (
                          <Link
                            to="/app/$serverId/$channelId"
                            params={{ serverId: g.id, channelId: c.id }}
                            viewTransition={false}
                            class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm"
                            classList={{
                              'bg-[#f7e26c] text-stone-900 font-medium': isActiveCh(),
                              'text-stone-600 dark:text-stone-400 hover:bg-[#e0d6bd] dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100':
                                !isActiveCh(),
                            }}
                          >
                            <i class="fa-solid fa-hashtag text-xs opacity-70 shrink-0 w-3 text-center" />
                            <span class="truncate">{c.name}</span>
                          </Link>
                        );
                      }}
                    </For>
                    <Show when={g.channels.length === 0}>
                      <div class="px-3 py-1.5 text-xs text-stone-400 italic font-display">
                        {t('app-no-channels')}
                      </div>
                    </Show>
                    <Show
                      when={
                        props.onAddChannel &&
                        (props.canAddChannel ? props.canAddChannel(g.id) : true)
                      }
                    >
                      <button
                        type="button"
                        onClick={() => props.onAddChannel!(g.id)}
                        class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-stone-500 hover:bg-[#e0d6bd] dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        title={t('app-create-channel')}
                      >
                        <i class="fa-solid fa-plus text-[0.6rem] shrink-0 w-3 text-center" />
                        <span class="truncate font-display italic">
                          {t('app-create-channel')}
                        </span>
                      </button>
                    </Show>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
        <Show when={guilds().length === 0}>
          <div class="px-3 py-4 text-xs text-stone-400 italic font-display text-center">
            {t('app-no-servers')}
          </div>
        </Show>
      </div>

      <Show when={currentUser()}>
        {(self) => (
          <div class="shrink-0 px-3 py-3 border-t border-stone-200/70 dark:border-stone-800/60 flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => props.onOpenProfile?.(self(), e)}
              class="flex items-center gap-3 flex-1 min-w-0 rounded-xl px-1 py-1 -mx-1 hover:bg-[#ece4cf] dark:hover:bg-stone-800/40 transition-colors text-left"
              title={`${self().username}/${self().tag}`}
            >
              <div class="relative shrink-0">
                <Avatar user={self()} size={36} />
                <span
                  class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#f5efe1] dark:ring-[#211e1b]"
                  style={{ 'background-color': statusColors[self().status] }}
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                  {self().username}
                </div>
                <div class="text-xs text-stone-500 truncate font-display italic">
                  {statusLabels[self().status]}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => props.onOpenSettings?.()}
              class="w-9 h-9 rounded-xl text-stone-400 hover:bg-[#ece4cf] dark:hover:bg-stone-800/40 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center transition-colors shrink-0"
              title={t('settings-title')}
            >
              <i class="fa-solid fa-gear text-sm" />
            </button>
          </div>
        )}
      </Show>
    </aside>
  );
}

function SidebarNavItem(props: { icon: string; label: string; badge?: number }) {
  return (
    <button
      type="button"
      class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-[#ece4cf] dark:hover:bg-stone-800/40 hover:text-stone-900 dark:hover:text-stone-100 transition-colors text-left"
    >
      <i class={`fa-solid ${props.icon} text-sm w-4 text-center opacity-80`} />
      <span class="flex-1 text-sm">{props.label}</span>
      <Show when={props.badge}>
        <span class="text-xs px-1.5 py-0.5 rounded-md bg-[#e0d6bd] dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
          {props.badge}
        </span>
      </Show>
    </button>
  );
}
