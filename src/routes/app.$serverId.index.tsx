import { createFileRoute } from '@tanstack/solid-router';
import { Show } from 'solid-js';
import { useGuild } from '../state/gateway-data';

export const Route = createFileRoute('/app/$serverId/')({
  component: ServerIndex,
});

function ServerIndex() {
  const params = Route.useParams();
  const guild = useGuild(() => params().serverId);
  return (
    <main class="flex-1 min-w-0 flex flex-col items-center justify-center my-3 mr-2 bg-white dark:bg-[#211e1b] rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div class="text-center px-8">
        <h2 class="font-display text-3xl mb-2">{guild()?.name ?? 'unknown server'}</h2>
        <Show when={guild()?.brief}>
          <p class="text-sm text-stone-500 italic font-display mb-4">{guild()?.brief}</p>
        </Show>
        <p class="text-sm text-stone-500 italic font-display">
          pick a channel from the sidebar.
        </p>
      </div>
    </main>
  );
}
