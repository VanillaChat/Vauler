import { Show } from 'solid-js';
import { type GatewayChannel } from '../../api/gateway';
import { t } from '../../i18n';
import { formatCooldown } from './utils';

type Props = {
  channel: () => GatewayChannel | undefined;
  cooldown: () => number;
  isOwner: () => boolean;
};

export function SlowmodeIndicator(props: Props) {
  return (
    <Show when={(props.channel()?.rateLimitPerUser ?? 0) > 0}>
      <div class="px-4 sm:px-6 pt-1 pb-0.5 flex items-center gap-1.5 text-xs text-stone-500">
        <i
          class="fa-solid fa-stopwatch text-[#a37b00] dark:text-[#f7e26c]"
          classList={{ 'animate-pulse': props.cooldown() > 0 }}
        />
        <span
          class="tabular-nums font-mono opacity-60"
          classList={{ 'line-through': props.isOwner() }}
          title={props.isOwner() ? t('slowmode-bypassed') : undefined}
        >
          {formatCooldown(props.channel()!.rateLimitPerUser!)}
        </span>
        <Show when={!props.isOwner()}>
          <span
            class="tabular-nums font-mono text-stone-700 dark:text-stone-200 transition-opacity duration-200"
            classList={{
              'opacity-100': props.cooldown() > 0,
              'opacity-0': props.cooldown() === 0,
            }}
          >
            · {t('slowmode-left', { time: formatCooldown(Math.max(props.cooldown(), 1)) })}
          </span>
        </Show>
      </div>
    </Show>
  );
}
