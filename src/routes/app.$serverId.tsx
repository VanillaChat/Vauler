import { createFileRoute, Link, Outlet, useMatch } from '@tanstack/solid-router';
import { createMemo, For, Show } from 'solid-js';
import type { GatewayChannel, GatewayUser } from '../api/gateway';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../contexts/profile';
import { useGuild, useGuildUsers } from '../state/gateway-data';

export const Route = createFileRoute('/app/$serverId')({
  component: ServerLayout,
});

function ServerLayout() {
  const params = Route.useParams();
  const profile = useProfile();
  const channelMatch = useMatch({
    from: '/app/$serverId/$channelId',
    shouldThrow: false,
  });
  const currentChannelId = createMemo<string | undefined>((prev) => {
    const id = channelMatch()?.params.channelId;
    return id ?? prev;
  });

  const guild = useGuild(() => params().serverId);
  const guildUsers = useGuildUsers(() => params().serverId);
  const onlineMembers = () =>
    guildUsers().filter((u) => u.status !== 'UNAVAILABLE');
  const offlineMembers = () =>
    guildUsers().filter((u) => u.status === 'UNAVAILABLE');

  return (
    <>
      <aside class="w-64 shrink-0 bg-[#f5efe1] dark:bg-[#211e1b] flex flex-col rounded-3xl my-3 ml-1 mr-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div class="px-5 h-14 flex items-center justify-between shrink-0">
          <span class="font-display text-xl truncate">
            {guild()?.name ?? '—'}
          </span>
          <button
            class="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            title="Server menu"
          >
            <i class="fa-solid fa-ellipsis" />
          </button>
        </div>

        <Show when={guild()?.brief}>
          <div class="px-5 -mt-1 mb-2 text-xs text-stone-500 italic font-display truncate">
            {guild()?.brief}
          </div>
        </Show>

        <div class="flex-1 overflow-y-auto px-3 py-2 pb-4">
          <ChannelGroup
            label="rooms"
            items={guild()?.channels ?? []}
            currentId={currentChannelId}
            serverId={params().serverId}
          />
        </div>
      </aside>

      <Outlet />

      <aside class="hidden xl:flex w-64 shrink-0 my-3 mr-3 ml-0 bg-[#f5efe1] dark:bg-[#211e1b] rounded-3xl flex-col shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
        <div class="px-5 h-14 flex items-center gap-2 shrink-0">
          <span class="font-display text-lg">in the room</span>
          <span class="text-xs text-stone-400 font-display italic">
            {guildUsers().length}
          </span>
        </div>
        <div class="flex-1 overflow-y-auto px-3 py-1">
          <MemberGroup
            label="online"
            items={onlineMembers()}
            onSelect={profile.open}
          />
          <MemberGroup
            label="offline"
            items={offlineMembers()}
            muted
            onSelect={profile.open}
          />
        </div>
      </aside>
    </>
  );
}

function ChannelGroup(props: {
  label: string;
  items: GatewayChannel[];
  currentId: () => string | undefined;
  serverId: string;
}) {
  return (
    <div>
      <div class="px-3 mb-1.5 text-xs font-display italic text-stone-500">{props.label}</div>
      <div class="space-y-0.5">
        <For each={props.items}>
          {(c) => {
            const isActive = createMemo(() => c.id === props.currentId());
            return (
              <Link
                to="/app/$serverId/$channelId"
                params={{ serverId: props.serverId, channelId: c.id }}
                viewTransition={false}
                class={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${
                  isActive()
                    ? 'bg-[#f7e26c] text-stone-900 font-medium'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-[#e8dec0] dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <i class="fa-solid fa-hashtag text-xs opacity-70 shrink-0 w-3 text-center" />
                <span class="truncate">{c.name}</span>
              </Link>
            );
          }}
        </For>
        <Show when={props.items.length === 0}>
          <div class="px-3 py-2 text-xs text-stone-400 italic font-display">
            no channels yet
          </div>
        </Show>
      </div>
    </div>
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
