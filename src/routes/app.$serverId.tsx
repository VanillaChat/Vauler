import { createFileRoute, Outlet } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';
import type { GatewayUser } from '../api/gateway';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../contexts/profile';
import { t } from '../i18n';
import { useGuildUsers } from '../state/gateway-data';

export const Route = createFileRoute('/app/$serverId')({
  component: ServerLayout,
});

function ServerLayout() {
  const params = Route.useParams();
  const profile = useProfile();
  const guildUsers = useGuildUsers(() => params().serverId);
  const onlineMembers = () =>
    guildUsers().filter((u) => u.status !== 'UNAVAILABLE');
  const offlineMembers = () =>
    guildUsers().filter((u) => u.status === 'UNAVAILABLE');

  return (
    <>
      <Outlet />

      <aside class="hidden xl:flex w-64 shrink-0 my-3 mr-3 ml-0 bg-[#f5efe1] dark:bg-[#211e1b] rounded-3xl flex-col shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
        <div class="px-5 h-14 flex items-center gap-2 shrink-0">
          <span class="font-display text-lg">{t('members-room')}</span>
          <span class="text-xs text-stone-400 font-display italic">
            {guildUsers().length}
          </span>
        </div>
        <div class="flex-1 overflow-y-auto px-3 py-1">
          <Show when={onlineMembers().length > 0}>
            <MemberGroup
              label={t('members-online')}
              items={onlineMembers()}
              onSelect={profile.open}
            />
          </Show>
          <Show when={offlineMembers().length > 0}>
            <MemberGroup
              label={t('members-offline')}
              items={offlineMembers()}
              muted
              onSelect={profile.open}
            />
          </Show>
        </div>
      </aside>
    </>
  );
}

function MemberGroup(props: {
  label: string;
  items: GatewayUser[];
  muted?: boolean;
  onSelect: (u: GatewayUser, e: MouseEvent) => void;
}) {
  return (
    <div class="mb-4">
      <div class="px-3 mb-1.5 text-xs font-display italic text-stone-500">
        {props.label} · {props.items.length}
      </div>
      <div class="space-y-0.5">
        <For each={props.items}>
          {(u) => (
            <button
              onClick={(e) => props.onSelect(u, e)}
              class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-stone-100 dark:hover:bg-stone-800/40 cursor-pointer transition-colors text-left"
              classList={{ 'opacity-50': props.muted }}
            >
              <Avatar user={u} size={30} />
              <div class="flex-1 min-w-0">
                <div class="truncate">{u.nickname ?? u.username}</div>
                <Show when={u.bio}>
                  <div class="text-xs text-stone-500 italic font-display truncate">
                    {u.bio}
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
