import { For, Show } from 'solid-js';
import { updatePresence, type UserStatus } from '../../api/gateway';
import { statusColors, statusLabels } from '../Avatar';
import { t } from '../../i18n';
import { colorForId, currentUser, userPresence } from '../../state/gateway-data';
import type { ProfilePopoverApi } from '../../hooks/useProfilePopover';

const STATUSES: UserStatus[] = ['ONLINE', 'IDLE', 'DND', 'LOOKING_TO_PLAY', 'UNAVAILABLE'];

type Props = {
  api: ProfilePopoverApi;
};

export function ProfilePopover(props: Props) {
  return (
    <Show when={props.api.user()}>
      {(u) => (
        <div
          ref={props.api.setPopoverEl}
          class={`fixed z-50 w-72 rounded-2xl bg-white dark:bg-[#211e1b] shadow-2xl shadow-black/15 overflow-hidden border border-stone-200 dark:border-stone-800 ${
            props.api.closing() ? 'animate-popover-out' : 'animate-popover-in'
          }`}
          style={{
            left: `${props.api.pos().x}px`,
            ...(props.api.pinBottom() !== null
              ? { bottom: `${props.api.pinBottom()}px` }
              : { top: `${props.api.pos().y}px` }),
            'transform-origin': props.api.origin(),
          }}
        >
          <div
            class="h-20"
            style={{
              'background-color': colorForId(u().id),
              ...(u().banner
                ? {
                    'background-image': `url(${u().banner})`,
                    'background-size': 'cover',
                    'background-position': 'center',
                  }
                : {}),
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
                style={{
                  'background-color':
                    statusColors[userPresence(u().id) ?? 'UNAVAILABLE'],
                }}
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
                  {statusLabels[userPresence(u().id) ?? 'UNAVAILABLE']}
                </div>
              }
            >
              <div class="relative mt-1">
                <button
                  onClick={() =>
                    props.api.setStatusPickerOpen(!props.api.statusPickerOpen())
                  }
                  class="flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 text-xs font-display italic text-stone-500"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    style={{
                      'background-color':
                        statusColors[userPresence(u().id) ?? 'UNAVAILABLE'],
                    }}
                  />
                  <span>{statusLabels[userPresence(u().id) ?? 'UNAVAILABLE']}</span>
                  <i class="fa-solid fa-chevron-down text-[0.55rem] opacity-60" />
                </button>
                <Show when={props.api.statusPickerOpen()}>
                  <div class="absolute left-0 top-full mt-1 w-52 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-stone-800 shadow-xl shadow-black/10 p-1 z-10">
                    <For each={STATUSES}>
                      {(s) => (
                        <button
                          onClick={() => {
                            updatePresence(s);
                            props.api.setStatusPickerOpen(false);
                          }}
                          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-800/60 text-left"
                        >
                          <span
                            class="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ 'background-color': statusColors[s] }}
                          />
                          <span class="flex-1">{statusLabels[s]}</span>
                          <Show
                            when={s === (userPresence(u().id) ?? 'UNAVAILABLE')}
                          >
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
  );
}
