import { createFileRoute } from '@tanstack/solid-router';
import { Show } from 'solid-js';
import { gatewayState } from '../api/gateway';
import { guilds } from '../state/gateway-data';

export const Route = createFileRoute('/app/')({
  component: AppIndex,
});

function AppIndex() {
  return (
    <main class="flex-1 min-w-0 flex flex-col items-center justify-center my-3 mr-3 bg-white dark:bg-[#211e1b] rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <Show
        when={gatewayState() === 'ready'}
        fallback={
          <div class="text-stone-400 font-display italic text-xl">
            connecting…
          </div>
        }
      >
        <Show
          when={guilds().length > 0}
          fallback={
            <div class="text-center px-8">
              <h2 class="font-display text-3xl mb-2">no servers yet</h2>
              <p class="text-sm text-stone-500 italic font-display">
                join one or make your own.
              </p>
            </div>
          }
        >
          <div class="text-center px-8">
            <h2 class="font-display text-3xl mb-2">pick a server</h2>
            <p class="text-sm text-stone-500 italic font-display">
              choose one from the rail to get started.
            </p>
          </div>
        </Show>
      </Show>
    </main>
  );
}
