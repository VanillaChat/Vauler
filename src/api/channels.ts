import { api } from './client';
import type { ChannelType, GatewayChannel } from './gateway';

export type CreateChannelRequest = {
	name: string;
	rateLimitPerUser?: number;
	type?: ChannelType;
};

export function createChannel(
	guildId: string,
	payload: CreateChannelRequest,
): Promise<GatewayChannel> {
	const body: Record<string, unknown> = {
		name: payload.name,
	};

	if (payload.type !== undefined) {
		body.type = payload.type;
	}

	if (payload.rateLimitPerUser !== undefined) {
		body.rate_limit_per_user = payload.rateLimitPerUser;
	}

	return api<GatewayChannel>(`/guilds/${guildId}/channels`, {
		method: 'POST',
		json: body,
	});
}
