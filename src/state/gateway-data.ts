import { createMemo } from 'solid-js';
import {
  ready,
  type GatewayChannel,
  type GatewayGuild,
  type GatewayMember,
  type GatewayUser,
  type UserStatus,
} from '../api/gateway';

export const currentUser = () => ready()?.user;
export const guilds = () => ready()?.guilds ?? [];

export function getUser(id: string | undefined): GatewayUser | undefined {
  if (!id) return undefined;
  return ready()?.users?.[id];
}

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

export type GuildMemberView = GatewayMember & { user: GatewayUser; status: UserStatus };

export function useGuildUsers(guildId: () => string | undefined) {
  return createMemo<GuildMemberView[]>(() => {
    const r = ready();
    const g = guilds().find((g) => g.id === guildId());
    if (!g || !g.members || !r) return [];
    const presence = new Map(r.presences?.map((p) => [p.id, p.status]) ?? []);
    const out: GuildMemberView[] = [];
    for (const m of g.members) {
      const user = r.users?.[m.userId];
      if (!user) continue;
      out.push({ ...m, user, status: presence.get(m.userId) ?? 'UNAVAILABLE' });
    }
    return out;
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

export function userPresence(userId: string): UserStatus | undefined {
  return ready()?.presences?.find((p) => p.id === userId)?.status;
}

export const compactMode = () => ready()?.settings?.compactMode ?? false;
