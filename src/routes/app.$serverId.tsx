import { createFileRoute, Outlet } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';
import { Avatar } from '../components/Avatar';
import { useLayout } from '../contexts/layout';
import { useProfile } from '../contexts/profile';
import { t } from '../i18n';
import { useGuildUsers, type GuildMemberView } from '../state/gateway-data';

export const Route = createFileRoute('/app/$serverId')({
  component: ServerLayout,
});

function ServerLayout() {
  const params = Route.useParams();
  const profile = useProfile();
  const layout = useLayout();
  const guildUsers = useGuildUsers(() => params().serverId);
  const onlineMembers = () =>
    guildUsers().filter((u) => u.status !== 'UNAVAILABLE');
  const offlineMembers = () =>
    guildUsers().filter((u) => u.status === 'UNAVAILABLE');

  return (
    <>
      <Outlet />

      <aside
        class="w-64 max-w-[85vw] shrink-0 bg-[#f5efe1] dark:bg-[#211e1b] flex flex-col shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden fixed inset-y-0 right-0 z-40 lg:my-3 lg:mr-3 lg:ml-0 lg:rounded-3xl"
        style={layout.rightStyle()}
        onMouseLeave={() => {
          if (!layout.isMobile() && layout.membersCollapsed()) {
            layout.setMembersPeeking(false);
          }
        }}
      >
        <div class="px-5 h-14 flex items-center gap-2 shrink-0">
          <span class="font-display text-lg">{t('members-room')}</span>
          <span class="text-xs text-stone-400 font-display italic">
            {guildUsers().length}
          </span>
          <div class="flex-1" />
          <button
            type="button"
            onClick={() => layout.setMembersOpen(false)}
            class="lg:hidden w-9 h-9 -mr-1 rounded-xl text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 flex items-center justify-center"
            aria-label={t('app-close-menu')}
          >
            <i class="fa-solid fa-xmark text-base" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-3 py-1">
          <Show when={onlineMembers().length > 0}>
            <MemberGroup
              label={t('members-online')}
              items={onlineMembers()}
              onSelect={(m, e) => profile.open(m.user, e)}
            />
          </Show>
          <Show when={offlineMembers().length > 0}>
            <MemberGroup
              label={t('members-offline')}
              items={offlineMembers()}
              muted
              onSelect={(m, e) => profile.open(m.user, e)}
            />
          </Show>
        </div>
      </aside>
    </>
  );
}

function MemberGroup(props: {
  label: string;
  items: GuildMemberView[];
  muted?: boolean;
  onSelect: (u: GuildMemberView, e: MouseEvent) => void;
}) {
  return (
    <div class="mb-4">
      <div class="px-3 mb-1.5 text-xs font-display italic text-stone-500">
        {props.label} · {props.items.length}
      </div>
      <div class="space-y-0.5">
        <For each={props.items}>
          {(m) => (
            <button
              onClick={(e) => props.onSelect(m, e)}
              class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-stone-100 dark:hover:bg-stone-800/40 cursor-pointer transition-colors text-left"
              classList={{ 'opacity-50': props.muted }}
            >
              <Avatar user={m.user} status={m.status} size={30} />
              <div class="flex-1 min-w-0">
                <div class="truncate">{m.nickname ?? m.user.username}</div>
                <Show when={m.user.bio}>
                  <div class="text-xs text-stone-500 italic font-display truncate">
                    {m.user.bio}
                  </div>
                </Show>
              </div>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
