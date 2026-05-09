import { createMemo } from 'solid-js';
import {
  ready,
  type GatewayChannel,
  type GatewayGuild,
  type GatewayUser,
  type UserStatus,
} from '../api/gateway';

export const currentUser = () => ready()?.user;
export const guilds = () => ready()?.guilds ?? [];

export function useGuild(id: () => string | undefined) {
  return createMemo<GatewayGuild | undefined>(() => guilds().find((g) => g.id === id()));
}

export function useChannel(
  guildId: () => string | undefined,
  channelId: () => string | undefined,
) {
  return createMemo<GatewayChannel | undefined>(() => {
    const g = guilds().find((g) => g.id === guildId());
    return g?.channels.find((c) => c.id === channelId());
  });
}

export function useGuildUsers(guildId: () => string | undefined) {
  return createMemo<GatewayUser[]>(() => {
    const g = guilds().find((g) => g.id === guildId());
    if (!g || !g.members) return [];
    const presence = new Map(ready()?.presences.map((p) => [p.userId, p.status]) ?? []);
    return g.members.map<GatewayUser>((m) => ({
      ...m.user,
      status: presence.get(m.user.id) ?? m.user.status,
    }));
  });
}

const PALETTE = [
  '#f7e26c',
  '#a8c8ff',
  '#ffb3a8',
  '#c4f0a8',
  '#e8a8ff',
  '#ffd9a8',
  '#a8e8e0',
  '#d4b8ff',
  '#ffc4d4',
  '#b8d4a8',
];

export function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function isOnline(s: UserStatus): boolean {
  return s !== 'UNAVAILABLE';
}
