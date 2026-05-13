import { createFileRoute, Outlet, useMatch, useNavigate } from '@tanstack/solid-router';
import { createMemo, createSignal, onMount, Show } from 'solid-js';
import { connect } from '../api/gateway';
import { ConnectionBar } from '../components/app/ConnectionBar';
import { ProfilePopover } from '../components/app/ProfilePopover';
import { CreateChannelModal } from '../components/CreateChannelModal';
import { ServerChannelList } from '../components/ServerChannelList';
import { ServerModal } from '../components/ServerModal';
import { SettingsModal } from '../components/SettingsModal';
import { LayoutContext } from '../contexts/layout';
import { ProfileContext } from '../contexts/profile';
import { useLayoutState } from '../hooks/useLayoutState';
import { useProfilePopover } from '../hooks/useProfilePopover';
import { currentUser, guilds } from '../state/gateway-data';

export const Route = createFileRoute('/app')({
	component: AppLayout,
});

const ANIM_MS = 130;

function AppLayout() {
	onMount(() => connect());

	const navigate = useNavigate();
	const serverMatch = useMatch({ from: '/app/$serverId', shouldThrow: false });
	const currentServerId = createMemo<string | undefined>((prev) => {
		const id = serverMatch()?.params.serverId;
		return id ?? prev;
	});
	const channelMatch = useMatch({ from: '/app/$serverId/$channelId', shouldThrow: false });
	const currentChannelId = createMemo<string | undefined>((prev) => {
		const id = channelMatch()?.params.channelId;
		return id ?? prev;
	});

	const layout = useLayoutState({ currentServerId, currentChannelId });
	const profile = useProfilePopover();

	const [serverModalOpen, setServerModalOpen] = createSignal(false);
	const [serverModalClosing, setServerModalClosing] = createSignal(false);
	const [settingsOpen, setSettingsOpen] = createSignal(false);
	const [settingsClosing, setSettingsClosing] = createSignal(false);
	const [channelModalGuildId, setChannelModalGuildId] = createSignal<string | null>(null);
	const [channelModalClosing, setChannelModalClosing] = createSignal(false);

	const closeServerModal = () => {
		if (!serverModalOpen() || serverModalClosing()) return;
		setServerModalClosing(true);
		setTimeout(() => {
			setServerModalOpen(false);
			setServerModalClosing(false);
		}, ANIM_MS);
	};

	const closeSettings = () => {
		if (!settingsOpen() || settingsClosing()) return;
		setSettingsClosing(true);
		setTimeout(() => {
			setSettingsOpen(false);
			setSettingsClosing(false);
		}, ANIM_MS);
	};

	const closeChannelModal = () => {
		if (!channelModalGuildId() || channelModalClosing()) return;
		setChannelModalClosing(true);
		setTimeout(() => {
			setChannelModalGuildId(null);
			setChannelModalClosing(false);
		}, ANIM_MS);
	};

	const onPickServer = (id: string) => {
		const g = guilds().find((g) => g.id === id);
		const first = g?.channels[0];
		if (first) {
			navigate({
				to: '/app/$serverId/$channelId',
				params: { serverId: id, channelId: first.id },
				viewTransition: false,
			});
		} else {
			navigate({ to: '/app/$serverId', params: { serverId: id }, viewTransition: false });
		}
	};

	return (
		<LayoutContext.Provider value={layout}>
			<ProfileContext.Provider
				value={{
					open: profile.open,
					openSettings: () => {
						setSettingsClosing(false);
						setSettingsOpen(true);
					},
				}}
			>
				<div class="h-dvh flex bg-[#fdfaf3] dark:bg-[#1a1816] text-stone-800 dark:text-stone-100 overflow-hidden">
					<Show when={!layout.isMobile() && layout.sidebarCollapsed() && !layout.sidebarPeeking()}>
						<div
							class="hidden lg:block fixed inset-y-0 left-0 w-2 z-40"
							onMouseEnter={() => layout.setSidebarPeeking(true)}
							aria-hidden="true"
						/>
					</Show>
					<Show
						when={
							!layout.isMobile() &&
							layout.membersCollapsed() &&
							!layout.membersPeeking() &&
							currentServerId()
						}
					>
						<div
							class="hidden lg:block fixed inset-y-0 right-0 w-2 z-40"
							onMouseEnter={() => layout.setMembersPeeking(true)}
							aria-hidden="true"
						/>
					</Show>
					<Show
						when={
							layout.isMobile() && (layout.sidebarOpen() || layout.membersOpen() || layout.drag())
						}
					>
						<div
							class="fixed inset-0 z-30 bg-stone-900/40 backdrop-blur-sm lg:hidden"
							classList={{ 'animate-fade-in': !layout.drag() }}
							style={{ 'pointer-events': layout.drag() ? 'none' : 'auto' }}
							onClick={() => {
								layout.setSidebarOpen(false);
								layout.setMembersOpen(false);
							}}
						/>
					</Show>

					<ConnectionBar />

					<ServerChannelList
						currentServerId={currentServerId}
						currentChannelId={currentChannelId}
						onPickServer={onPickServer}
						onAddServer={() => setServerModalOpen(true)}
						canAddChannel={(id) => guilds().find((g) => g.id === id)?.ownerId === currentUser()?.id}
						onAddChannel={(id) => {
							setChannelModalClosing(false);
							setChannelModalGuildId(id);
						}}
						onOpenProfile={(user, e) => profile.open(user, e, false, true, true)}
						onOpenSettings={() => {
							setSettingsClosing(false);
							setSettingsOpen(true);
						}}
					/>

					<Outlet />

					<Show when={serverModalOpen() || serverModalClosing()}>
						<ServerModal
							closing={serverModalClosing()}
							onClose={closeServerModal}
							onCreated={(id) =>
								navigate({
									to: '/app/$serverId',
									params: { serverId: id },
									viewTransition: false,
								})
							}
						/>
					</Show>

					<Show when={settingsOpen() || settingsClosing()}>
						<SettingsModal closing={settingsClosing()} onClose={closeSettings} />
					</Show>

					<Show when={channelModalGuildId()}>
						{(guildId) => (
							<CreateChannelModal
								guildId={guildId()}
								closing={channelModalClosing()}
								onClose={closeChannelModal}
								onCreated={(c) =>
									navigate({
										to: '/app/$serverId/$channelId',
										params: { serverId: guildId(), channelId: c.id },
										viewTransition: false,
									})
								}
							/>
						)}
					</Show>

					<ProfilePopover api={profile} />
				</div>
			</ProfileContext.Provider>
		</LayoutContext.Provider>
	);
}
