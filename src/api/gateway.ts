import { createSignal } from 'solid-js';
import type { Message } from './messages';
import { addMessage } from '../state/messages';

export const OP_DISPATCH = 0;
export const OP_HEARTBEAT = 1;
export const OP_IDENTIFY = 2;
export const OP_PRESENCE_UPDATE = 3;
export const OP_HELLO = 10;
export const OP_HEARTBEAT_ACK = 11;

export type UserStatus =
  | 'ONLINE'
  | 'IDLE'
  | 'DND'
  | 'LOOKING_TO_PLAY'
  | 'UNAVAILABLE';

export type GatewayUser = {
  id: string;
  username: string;
  tag: string;
  createdAt: Date;
  bot: boolean;
  status: UserStatus;
  flags: number;
  nickname?: string;
  bio: string | null;
  avatar?: string | null;
  banner?: string | null;
};

export type GatewayAccount = {
  id: string;
  email: string;
  emailVerified: string;
  locale: string;
};

export type GatewaySettings = {
  theme: 'LIGHT' | 'DARK' | 'DIM';
  compactMode: boolean;
  compactShowAvatars: boolean;
  pendingDeletion: boolean;
  deleteAt: number;
};

export type GatewayChannel = {
  id: string;
  name: string;
  createdAt: string;
  guildId: string;
};

export type GatewayMember = {
  id: number;
  nickname: string | null;
  userId: string;
  joinedAt: string;
  user: GatewayUser;
};

export type GatewayGuild = {
  id: string;
  name: string;
  brief: string;
  icon: string | null;
  ownerId: string;
  createdAt: string;
  channels: GatewayChannel[];
  members: GatewayMember[];
};

export type GatewayPresence = {
  userId: string;
  status: UserStatus;
};

export type ReadyPayload = {
  user: GatewayUser;
  account: GatewayAccount;
  settings: GatewaySettings;
  guilds: GatewayGuild[];
  presences: GatewayPresence[];
};

export type GatewayMessage = {
  op: number;
  d?: unknown;
  t?: string;
  s?: number;
};

export type GatewayState = 'disconnected' | 'connecting' | 'connected' | 'ready';

type Persisted = {
  ws: WebSocket | null;
  heartbeatTimer: number | null;
  readyData: ReadyPayload | null;
  state: GatewayState;
};

const g = globalThis as { __vanillaGateway?: Persisted };
const persisted: Persisted = (g.__vanillaGateway ??= {
  ws: null,
  heartbeatTimer: null,
  readyData: null,
  state: 'disconnected',
});

const initialState: GatewayState =
  persisted.ws?.readyState === WebSocket.OPEN
    ? persisted.readyData
      ? 'ready'
      : 'connected'
    : persisted.ws?.readyState === WebSocket.CONNECTING
      ? 'connecting'
      : 'disconnected';

const [state, _setState] = createSignal<GatewayState>(initialState);
const [readyData, _setReadyData] = createSignal<ReadyPayload | null>(persisted.readyData);

const setState = (v: GatewayState) => {
  persisted.state = v;
  _setState(v);
};
const setReadyData = (v: ReadyPayload | null) => {
  persisted.readyData = v;
  _setReadyData(v);
};

const handlers = new Set<(msg: GatewayMessage) => void>();

export const gatewayState = state;
export const ready = readyData;

export function addGuild(guild: GatewayGuild) {
  const r = readyData();
  if (!r) return;
  const safe: GatewayGuild = {
    ...guild,
    channels: guild.channels ?? [],
    members: guild.members ?? [],
  };
  const idx = r.guilds.findIndex((g) => g.id === safe.id);
  if (idx !== -1) {
    const old = r.guilds[idx];
    const merged: GatewayGuild = {
      ...old,
      ...safe,
      channels: safe.channels.length > 0 ? safe.channels : old.channels,
      members: safe.members.length > 0 ? safe.members : old.members,
    };
    const newGuilds = [...r.guilds];
    newGuilds[idx] = merged;
    setReadyData({ ...r, guilds: newGuilds });
    return;
  }
  setReadyData({ ...r, guilds: [...r.guilds, safe] });
}

export function removeGuild(guildId: string) {
  const r = readyData();
  if (!r) return;
  setReadyData({ ...r, guilds: r.guilds.filter((g) => g.id !== guildId) });
}

export function addGuildMember(guildId: string, member: GatewayMember) {
  const r = readyData();
  if (!r) return;
  const idx = r.guilds.findIndex((g) => g.id === guildId);
  if (idx === -1) return;
  const guild = r.guilds[idx];
  const existing = guild.members ?? [];
  if (existing.some((m) => m.userId === member.userId)) return;
  const newGuild = { ...guild, members: [...existing, member] };
  const newGuilds = [...r.guilds];
  newGuilds[idx] = newGuild;
  setReadyData({ ...r, guilds: newGuilds });
}

export function removeGuildMember(guildId: string, userId: string) {
  const r = readyData();
  if (!r) return;
  const idx = r.guilds.findIndex((g) => g.id === guildId);
  if (idx === -1) return;
  const guild = r.guilds[idx];
  const newGuild = {
    ...guild,
    members: (guild.members ?? []).filter((m) => m.userId !== userId),
  };
  const newGuilds = [...r.guilds];
  newGuilds[idx] = newGuild;
  setReadyData({ ...r, guilds: newGuilds });
}

export function applyPresence(userId: string, status: UserStatus) {
  const r = readyData();
  if (!r) return;
  const presences = r.presences ?? [];
  const idx = presences.findIndex((p) => p.userId === userId);
  const next =
    idx === -1
      ? [...presences, { userId, status }]
      : presences.map((p) => (p.userId === userId ? { ...p, status } : p));
  const user = r.user?.id === userId ? { ...r.user, status } : r.user;
  setReadyData({ ...r, presences: next, user });
}

function resolveGatewayUrl(): string {
  const url = process.env.GATEWAY_URL;
  if (url.startsWith('ws://') || url.startsWith('wss://')) return url;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${url}`;
}

function attachHandlers(socket: WebSocket) {
  socket.onopen = () => setState('connected');
  socket.onclose = () => {
    clearHeartbeat();
    setReadyData(null);
    setState('disconnected');
    persisted.ws = null;
  };
  socket.onerror = () => {};
  socket.onmessage = (e) => {
    let msg: GatewayMessage;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    handleMessage(msg);
    handlers.forEach((h) => h(msg));
  };
}

// Re-attach handlers on hot reload if WS already exists
if (
  persisted.ws &&
  (persisted.ws.readyState === WebSocket.OPEN ||
    persisted.ws.readyState === WebSocket.CONNECTING)
) {
  attachHandlers(persisted.ws);
}

export function connect() {
  const existing = persisted.ws;
  if (
    existing &&
    (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }
  setState('connecting');
  const socket = new WebSocket(resolveGatewayUrl());
  persisted.ws = socket;
  attachHandlers(socket);
}

function handleMessage(msg: GatewayMessage) {
  if (msg.op === OP_HELLO) {
    const interval =
      (msg.d as { heartbeat_interval?: number } | undefined)?.heartbeat_interval ?? 30000;
    sendIdentify();
    sendHeartbeat();
    clearHeartbeat();
    persisted.heartbeatTimer = window.setInterval(sendHeartbeat, interval);
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'READY') {
    setReadyData(msg.d as ReadyPayload);
    setState('ready');
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'GUILD_CREATE') {
    const d = msg.d as
      | (GatewayGuild & { guild?: GatewayGuild; channels?: GatewayChannel[]; members?: GatewayMember[] })
      | undefined;
    if (!d) return;
    const inner = d.guild ?? d;
    const channels = d.channels ?? inner?.channels ?? [];
    const members = d.members ?? inner?.members ?? [];
    if (inner?.id) {
      addGuild({ ...inner, channels, members });
    }
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'GUILD_DELETE') {
    const guildId = (msg.d as { id?: string } | undefined)?.id;
    if (guildId) removeGuild(guildId);
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'GUILD_MEMBER_ADD') {
    const d = msg.d as
      | {
          guildId: string;
          nickname: string | null;
          userId: string;
          user: GatewayUser;
        }
      | undefined;
    if (d?.guildId && d?.user) {
      addGuildMember(d.guildId, {
        id: 0,
        nickname: d.nickname ?? null,
        userId: d.userId,
        joinedAt: new Date().toISOString(),
        user: d.user,
      });
    }
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'GUILD_MEMBER_REMOVE') {
    const d = msg.d as { guildId?: string; userId?: string } | undefined;
    if (d?.guildId && d?.userId) removeGuildMember(d.guildId, d.userId);
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'PRESENCE_UPDATE') {
    const d = msg.d as { userId?: string; status?: UserStatus } | undefined;
    if (d?.userId && d?.status) applyPresence(d.userId, d.status);
    return;
  }

  if (msg.op === OP_DISPATCH && msg.t === 'MESSAGE_CREATE') {
    addMessage(msg.d as Message);
    return;
  }
}

function sendHeartbeat() {
  send({ op: OP_HEARTBEAT, d: null });
}

function sendIdentify() {
  send({ op: OP_IDENTIFY, d: {} });
}

function clearHeartbeat() {
  if (persisted.heartbeatTimer !== null) {
    clearInterval(persisted.heartbeatTimer);
    persisted.heartbeatTimer = null;
  }
}

export function disconnect() {
  clearHeartbeat();
  persisted.ws?.close();
  persisted.ws = null;
  setReadyData(null);
  setState('disconnected');
}

export function send(payload: unknown) {
  if (persisted.ws?.readyState === WebSocket.OPEN) {
    persisted.ws.send(JSON.stringify(payload));
  }
}

export function updatePresence(status: UserStatus) {
  send({ op: OP_PRESENCE_UPDATE, d: { status } });
  const r = readyData();
  if (r?.user) {
    applyPresence(r.user.id, status);
  }
}

export function onMessage(handler: (msg: GatewayMessage) => void): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
