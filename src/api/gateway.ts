import { createSignal } from 'solid-js';

export const OP_DISPATCH = 0;
export const OP_HEARTBEAT = 1;
export const OP_IDENTIFY = 2;
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

const [state, setState] = createSignal<GatewayState>('disconnected');
const [readyData, setReadyData] = createSignal<ReadyPayload | null>(null);

let ws: WebSocket | null = null;
let heartbeatTimer: number | null = null;
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

function resolveGatewayUrl(): string {
  const url = process.env.GATEWAY_URL;
  if (url.startsWith('ws://') || url.startsWith('wss://')) return url;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${url}`;
}

export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  setState('connecting');
  ws = new WebSocket(resolveGatewayUrl());

  ws.onopen = () => setState('connected');
  ws.onclose = () => {
    clearHeartbeat();
    setReadyData(null);
    setState('disconnected');
    ws = null;
  };
  ws.onerror = () => {};
  ws.onmessage = (e) => {
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

function handleMessage(msg: GatewayMessage) {
  if (msg.op === OP_HELLO) {
    const interval =
      (msg.d as { heartbeat_interval?: number } | undefined)?.heartbeat_interval ?? 30000;
    sendIdentify();
    sendHeartbeat();
    clearHeartbeat();
    heartbeatTimer = window.setInterval(sendHeartbeat, interval);
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
}

function sendHeartbeat() {
  send({ op: OP_HEARTBEAT, d: null });
}

function sendIdentify() {
  send({ op: OP_IDENTIFY, d: {} });
}

function clearHeartbeat() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function disconnect() {
  clearHeartbeat();
  ws?.close();
  ws = null;
  setReadyData(null);
  setState('disconnected');
}

export function send(payload: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function onMessage(handler: (msg: GatewayMessage) => void): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
