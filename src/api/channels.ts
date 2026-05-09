import { api } from './client';
import type { GatewayChannel } from './gateway';

export type CreateChannelRequest = {
  name: string;
  rateLimitPerUser?: number;
};

export function createChannel(
  guildId: string,
  payload: CreateChannelRequest,
): Promise<GatewayChannel> {
  const body: Record<string, unknown> = { name: payload.name };
  if (payload.rateLimitPerUser !== undefined) {
    body.rate_limit_per_user = payload.rateLimitPerUser;
  }
  return api<GatewayChannel>(`/guilds/${guildId}/channels`, {
    method: 'POST',
    json: body,
  });
}
