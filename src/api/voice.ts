import { api } from './client';
import { getClientSessionId } from './client-session';

export type VoiceQuality = 'VOICE_LOSSLESS' | 'STUDIO_LOSSLESS' | 'MUSIC_LOSSLESS';

export type VoiceAudioFormat = {
	sampleRate: number;
	bitDepth: number;
	channels: number;
	estimatedBitrateBps: number;
};

export type VoiceParticipant = {
	userId: string;
	guildId: string;
	channelId: string;
	quality: VoiceQuality;
	audioFormat: VoiceAudioFormat;
	selfMute: boolean;
	selfDeaf: boolean;
	joinedAt: number;
};

export type VoiceChannelState = {
	guildId: string;
	channelId: string;
	participants: VoiceParticipant[];
};

export type JoinVoiceRequest = {
	quality: VoiceQuality;
	selfMute?: boolean;
	selfDeaf?: boolean;
};

export function fetchVoiceState(channelId: string): Promise<VoiceChannelState> {
	return api<VoiceChannelState>(`/channels/${channelId}/voice`);
}

export function joinVoice(
	channelId: string,
	payload: JoinVoiceRequest,
): Promise<VoiceChannelState> {
	return api<VoiceChannelState>(`/channels/${channelId}/voice/join`, {
		method: 'POST',
		json: {
			...payload,
			clientSessionId: getClientSessionId(),
		},
	});
}

export function leaveVoice(channelId: string): Promise<VoiceChannelState> {
	return api<VoiceChannelState>(`/channels/${channelId}/voice/leave`, {
		method: 'POST',
		clientSessionId: getClientSessionId(),
	});
}
