import { createSignal } from 'solid-js';
import type { Message } from '../api/messages';

const [byChannel, setByChannel] = createSignal<Record<string, Message[]>>({});

export const messageStore = byChannel;

function dedupeMerge(existing: Message[], incoming: Message[]): Message[] {
  const seen = new Set<string>();
  const merged: Message[] = [];
  for (const m of [...existing, ...incoming]) {
    if (!m?.id || seen.has(m.id)) continue;
    seen.add(m.id);
    merged.push(m);
  }
  return merged;
}

export function addMessage(msg: Message) {
  if (!msg?.id || !msg.channelId) return;
  const map = byChannel();
  const existing = map[msg.channelId] ?? [];
  if (existing.some((m) => m.id === msg.id)) return;
  setByChannel({ ...map, [msg.channelId]: [...existing, msg] });
}

export function setChannelMessages(channelId: string, msgs: Message[]) {
  setByChannel({ ...byChannel(), [channelId]: dedupeMerge([], msgs) });
}

export function prependMessages(channelId: string, older: Message[]) {
  if (!older?.length) return;
  const map = byChannel();
  const existing = map[channelId] ?? [];
  setByChannel({ ...map, [channelId]: dedupeMerge(older, existing) });
}

const loadedChannels = new Set<string>();
export const isChannelLoaded = (id: string) => loadedChannels.has(id);
export const markChannelLoaded = (id: string) => loadedChannels.add(id);

const exhaustedChannels = new Set<string>();
export const isChannelExhausted = (id: string) => exhaustedChannels.has(id);
export const markChannelExhausted = (id: string) => exhaustedChannels.add(id);
