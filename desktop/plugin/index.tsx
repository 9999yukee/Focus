// SPDX-License-Identifier: GPL-3.0-or-later
import { definePluginSettings } from '@api/Settings';
import SettingsPlugin from '@plugins/_core/settings';
import ErrorBoundary from '@components/ErrorBoundary';
import definePlugin, { PluginNative, StartAt } from '@utils/types';
import { Menu, React, UserStore } from '@webpack/common';
import { findByPropsLazy } from '@webpack';
import type { ComponentType, ReactNode } from 'react';
import { FocusPreferences, HiddenItem, normalize, validItem } from './model';
import { focusLayout, LayoutNode } from './layout';
import { FocusRuntime } from './runtime';
import { FrameSampler } from './shared/performance/FrameSampler';
import { GuildNode, profileSections, UnreadItem, visibleGuildNode, visibleUnreadItems } from './navigation';
import { focusPatches } from './patches';

const Native = VencordNative.pluginHelpers.Focus as PluginNative<typeof import('./native')>;
const settings = definePluginSettings({}).withPrivateSettings<{ preferences: FocusPreferences }>();
let runtime: FocusRuntime | undefined;
let originalLayout: typeof SettingsPlugin.buildLayout | undefined;
const questComponents = new WeakMap<ComponentType<Record<string, unknown>>, ComponentType<Record<string, unknown>>>();
const ProfileActions = findByPropsLazy('openUserProfileModal');
const focusVersion = '0.2.0';
const releaseApi = 'https://api.github.com/repos/9999yukee/Focus/releases/latest';
function ProfileEntry() {
    const [failed, setFailed] = React.useState(false);
    return <div className="focus-settings"><div className="focus-row">
        <span>Modifier le profil<small>Avatar, bannière, bio et apparence du profil.</small></span>
        <button type="button" onClick={() => {
            try {
                const user = UserStore.getCurrentUser();
                if (user) ProfileActions.openUserProfileModal({ userId: user.id });
            } catch { setFailed(true); }
        }}>Modifier</button>
    </div>{failed && <p role="alert">Le profil n’a pas pu être ouvert. Réessayez dans un instant.</p>}</div>;
}
function Updater() {
    const [status, setStatus] = React.useState<'idle' | 'checking' | 'available' | 'updating' | 'current' | 'error'>('idle');
    const [release, setRelease] = React.useState<{ version: string; url: string; checksumUrl: string }>();
    const check = async () => {
        setStatus('checking');
        try {
            const response = await fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } });
            if (!response.ok) throw new Error('release unavailable');
            const data = await response.json() as { tag_name?: string; assets?: { name?: string; browser_download_url?: string }[] };
            const version = (data.tag_name ?? '').replace(/^v/, '');
            const asset = data.assets?.find(item => /^Focus-\d+\.\d+\.\d+-Setup\.exe$/.test(item.name ?? '')
                && (item.browser_download_url ?? '').startsWith('https://github.com/9999yukee/Focus/releases/download/'));
            const checksum = data.assets?.find(item => item.name === `${asset?.name}.sha256`);
            if (!/^\d+\.\d+\.\d+$/.test(version) || !asset?.browser_download_url || !checksum?.browser_download_url) throw new Error('invalid release');
            const newer = version.localeCompare(focusVersion, undefined, { numeric: true }) > 0;
            setRelease({ version, url: asset.browser_download_url, checksumUrl: checksum.browser_download_url });
            setStatus(newer ? 'available' : 'current');
        } catch { setStatus('error'); }
    };
    const update = async () => {
        if (!release) return;
        setStatus('updating');
        try { await Native.downloadAndInstall(release.url, release.checksumUrl); }
        catch { setStatus('error'); }
    };
    return <div className="focus-row"><span>Mises à jour<small>{status === 'available' ? `Focus ${release?.version} est disponible.` :
        status === 'updating' ? 'Téléchargement et installation…' : status === 'current' ? 'Vous utilisez la dernière version.' :
            status === 'error' ? 'Mise à jour indisponible ou invalide.' : 'Vérifier les releases officielles GitHub.'}</small></span>
        {status === 'available' ? <button type="button" onClick={update}>Mettre à jour</button> :
            <button type="button" disabled={status === 'checking' || status === 'updating'} onClick={check}>{status === 'checking' ? 'Vérification…' : status === 'updating' ? 'Installation…' : 'Vérifier'}</button>}
    </div>;
}
function preferences(): FocusPreferences { return normalize(settings.store.preferences); }
function save(patch: Partial<FocusPreferences>): void {
    const next = normalize({ ...preferences(), ...patch });
    settings.store.preferences = next;
    runtime?.configure(next);
}
function hide(item: HiddenItem): void {
    if (!validItem(item)) return;
    const hidden = preferences().hidden;
    if (!hidden.some(entry => entry.kind === item.kind && entry.id === item.id)) save({ hidden: [...hidden, item] });
}
function restore(item: HiddenItem): void {
    save({ hidden: preferences().hidden.filter(entry => entry.kind !== item.kind || entry.id !== item.id) });
}
function FocusIcon({ width = 20, height = 20 }: { width?: number | string; height?: number | string }) {
    return <svg width={width} height={height} viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M4 3h12v3H7v3h7v3H7v5H4z" /></svg>;
}
function Toggle({ name, detail, value, onChange }: { name: string; detail?: string; value: boolean; onChange(value: boolean): void }) {
    return <div className="focus-row"><span>{name}{detail && <small>{detail}</small>}</span>
        <button type="button" role="switch" aria-label={name} aria-checked={value} onClick={() => onChange(!value)} /></div>;
}
function usePreferences(): FocusPreferences { settings.use(['preferences']); return preferences(); }
function HiddenItems() {
    const { hidden } = usePreferences();
    const labels = { server: 'Serveur', conversation: 'Conversation', friend: 'Ami' };
    return <section><h3>Éléments masqués · {hidden.length}</h3>
        <p>Masqués uniquement sur cet ordinateur. Les adhésions, amitiés et messages sont conservés.</p>
        {hidden.length === 0 ? <p>Aucun élément masqué. Utilisez le clic droit sur un serveur, un ami ou une conversation.</p> :
            hidden.map(item => <div className="focus-row" key={`${item.kind}:${item.id}`}>
                <span>{item.label || `${labels[item.kind]} …${item.id.slice(-4)}`}<small>{labels[item.kind]}</small></span>
                <button type="button" onClick={() => restore(item)}>Réafficher</button>
            </div>)}
    </section>;
}
function Appearance() {
    const pref = usePreferences();
    return <div className="focus-settings"><span className="focus-kicker">FOCUS / APPARENCE</span>
        <h2>L’essentiel, à votre façon.</h2><p>Les changements s’appliquent directement dans le client.</p>
        <h3>Thème</h3><div className="focus-themes">{([['black', 'Noir'], ['gray', 'Gris'], ['white', 'Blanc']] as const).map(([theme, label]) =>
            <button type="button" key={theme} aria-pressed={pref.theme === theme} onClick={() => save({ theme })}>{label}</button>)}</div>
        <button type="button" aria-pressed={pref.theme === 'discord'} onClick={() => save({ theme: 'discord' })}>Discord original</button>
        <h3>Focus</h3><Updater />
        <div className="focus-row"><label htmlFor="focus-density">Densité</label><select id="focus-density" value={pref.density}
            onChange={event => save({ density: event.target.value as FocusPreferences['density'] })}>
            <option value="compact">Compacte</option><option value="comfortable">Confortable</option></select></div>
        <Toggle name="Afficher les avatars" value={pref.showAvatars} onChange={showAvatars => save({ showAvatars })} />
        <Toggle name="Afficher les aperçus de liens" value={pref.showEmbeds} onChange={showEmbeds => save({ showEmbeds })} />
        <Toggle name="Afficher les autocollants" value={pref.showStickers} onChange={showStickers => save({ showStickers })} />
        <Toggle name="Masquer les promotions" detail="Nitro, boutique, découverte, quêtes et offres de boosts." value={pref.hidePromotions} onChange={hidePromotions => save({ hidePromotions })} />
        <Toggle name="Paramètres simplifiés" detail="Réduit la navigation Discord à six catégories Focus." value={pref.compactSettings} onChange={compactSettings => save({ compactSettings })} />
        <HiddenItems />
    </div>;
}
function Monitor() {
    const [enabled, setEnabled] = React.useState(false);
    const [sample, setSample] = React.useState<{ memory: number; cpu: number; processes: number; fps: number | null; nodes: number }>();
    const [error, setError] = React.useState('');
    React.useEffect(() => {
        if (!enabled) return;
        let alive = true;
        const frames = new FrameSampler();
        const visibility = () => document.hidden ? frames.stop() : frames.start();
        visibility(); document.addEventListener('visibilitychange', visibility);
        const timer = setInterval(async () => {
            if (document.hidden) return;
            try {
                const native = await Native.metrics();
                if (alive) setSample({ memory: native.workingSetMiB, cpu: native.cpuPercent, processes: native.processes,
                    fps: frames.take().fps, nodes: document.getElementsByTagName('*').length });
            } catch { if (alive) setError('Les mesures natives sont indisponibles.'); }
        }, 2000);
        return () => { alive = false; clearInterval(timer); frames.stop(); document.removeEventListener('visibilitychange', visibility); };
    }, [enabled]);
    return <section><h3>Mesures réelles</h3><Toggle name="Afficher le moniteur" value={enabled} onChange={setEnabled} />
        {enabled && (error ? <p role="status">{error}</p> : sample ? <div className="focus-stats">
            <div><strong>{sample.memory.toFixed(0)} Mio</strong>Mémoire des processus Discord</div>
            <div><strong>{sample.cpu.toFixed(1)} %</strong>CPU · {sample.processes} processus</div>
            <div><strong>{sample.fps?.toFixed(0) ?? '—'}</strong>Images/s de l’interface</div>
            <div><strong>{sample.nodes.toLocaleString('fr-FR')}</strong>Nœuds du document</div>
        </div> : <p role="status">Mesure en cours…</p>)}
    </section>;
}
function Performance() {
    const pref = usePreferences();
    return <div className="focus-settings"><span className="focus-kicker">FOCUS / PERFORMANCES</span><h2>Moins de mouvements.</h2>
        <p>Les politiques ci-dessous concernent l’interface et les pièces jointes. L’audio des appels reste géré par Discord.</p>
        <Toggle name="Réduire les animations" value={pref.reduceMotion} onChange={reduceMotion => save({ reduceMotion })} />
        <Toggle name="Animer les avatars" value={pref.animatedAvatars} onChange={animatedAvatars => save({ animatedAvatars })} />
        <Toggle name="Animer les emojis" value={pref.animatedEmoji} onChange={animatedEmoji => save({ animatedEmoji })} />
        <Toggle name="Mettre en pause les vidéos hors écran" value={pref.pauseOffscreenMedia} onChange={pauseOffscreenMedia => save({ pauseOffscreenMedia })} />
        <Toggle name="Lecture automatique des vidéos" value={pref.autoplayVideo} onChange={autoplayVideo => save({ autoplayVideo })} />
        <div className="focus-row"><label htmlFor="focus-background">Activité en arrière-plan</label><select id="focus-background" value={pref.backgroundMode}
            onChange={event => save({ backgroundMode: event.target.value as FocusPreferences['backgroundMode'] })}>
            <option value="minimum">Minimum</option><option value="balanced">Équilibrée</option></select></div>
        <p>Minimum : pause des vidéos de messages quand la fenêtre perd le focus. Équilibrée : pause quand elle est masquée.</p>
        <Monitor />
        <h3>Rendu des messages</h3><p>La virtualisation reste celle du client Discord. Focus ne remplace pas son moteur de messages.</p>
    </div>;
}
function GuildGuard({ node, render }: { node: GuildNode; render(node: GuildNode): ReactNode }) {
    const pref = usePreferences();
    const visible = visibleGuildNode(node, new Set(pref.hidden.filter(item => item.kind === 'server').map(item => item.id)));
    return visible ? <>{render(visible)}</> : null;
}
type UnreadProps = { items: UnreadItem[]; [key: string]: unknown };
function UnreadGuard({ Component, props }: { Component: ComponentType<UnreadProps>; props: UnreadProps }) {
    const pref = usePreferences();
    const hidden = new Set(pref.hidden.filter(item => item.kind !== 'friend').map(item => item.id));
    return <Component {...props} items={visibleUnreadItems(props.items, hidden, pref.hidePromotions)} />;
}
function addHide(children: ReactNode[], item: HiddenItem): void {
    if (!validItem(item)) return;
    const existing = preferences().hidden.some(entry => item.id === entry.id && item.kind === entry.kind);
    children.push(<Menu.MenuItem id={`focus-hide-${item.kind}`} key={`focus-hide-${item.kind}`}
        label={existing ? 'Réafficher dans Focus' : 'Masquer dans Focus'} action={() => existing ? restore(item) : hide(item)} />);
}
export default definePlugin({
    name: 'Focus',
    description: 'Focus intégré au client Discord Desktop : interface monochrome, navigation locale et réglages simplifiés.',
    authors: [{ name: 'Focus', id: 0n }],
    dependencies: ['Settings', 'ContextMenuAPI'],
    enabledByDefault: true,
    startAt: StartAt.DOMContentLoaded,
    settings,
    patches: focusPatches,
    hidePromotions: () => preferences().hidePromotions,
    questComponent(Component: ComponentType<Record<string, unknown>> | null) {
        if (!Component) return Component;
        let Guard = questComponents.get(Component);
        if (!Guard) {
            Guard = function FocusQuestBoundary(props) {
                const pref = usePreferences();
                return pref.hidePromotions ? null : <Component {...props} />;
            };
            questComponents.set(Component, Guard);
        }
        return Guard;
    },
    ProfileActivity: undefined as ComponentType<Record<string, unknown>> | undefined,
    renderProfileActivity(props: Record<string, unknown>) {
        const Activity = this.ProfileActivity;
        if (!Activity || (props.displayProfile as { private?: boolean } | undefined)?.private) return null;
        return <ErrorBoundary noop><div className="focus-profile-activity"><Activity {...props} focusCurrentOnly /></div></ErrorBoundary>;
    },
    profileTabs(items: { section: string }[]) { return profileSections(items, !!this.ProfileActivity); },
    renderGuild(node: GuildNode, render: (node: GuildNode) => ReactNode) {
        return <GuildGuard node={node} render={render} />;
    },
    renderUnreadIndicator(Component: ComponentType<UnreadProps>, props: UnreadProps) {
        return <UnreadGuard Component={Component} props={props} />;
    },
    contextMenus: {
        'guild-context'(children, { guild }) {
            if (guild) addHide(children, { id: guild.id, label: guild.name, kind: 'server' });
        },
        'user-context'(children, { user, channel, guildId }) {
            if (guildId) return;
            if (channel?.id && !channel.guild_id) addHide(children, { id: channel.id, label: channel.name || user?.globalName || user?.username || '', kind: 'conversation' });
            if (user) addHide(children, { id: user.id, label: user.globalName || user.username || '', kind: 'friend' });
        },
        'gdm-context'(children, { channel }) {
            if (channel) addHide(children, { id: channel.id, label: channel.name || '', kind: 'conversation' });
        }
    },
    settingsAboutComponent: Appearance,
    start() {
        runtime = new FocusRuntime(preferences());
        void Native.setBranding(true).catch(() => {});
        originalLayout = SettingsPlugin.buildLayout;
        SettingsPlugin.buildLayout = function (builder) {
            const layout = originalLayout!.call(this, builder);
            if (builder.key !== '$Root') return layout;
            const pref = preferences();
            const entries = {
                appearance: this.buildEntry({ key: 'focus_appearance_options', title: 'Focus · Apparence', Component: Appearance, Icon: FocusIcon }),
                performance: this.buildEntry({ key: 'focus_performance_options', title: 'Focus · Performances', Component: Performance, Icon: FocusIcon }),
                profile: this.buildEntry({ key: 'focus_profile_options', title: 'Modifier le profil', Component: ProfileEntry, Icon: FocusIcon })
            };
            return focusLayout(layout as LayoutNode[], pref.compactSettings, pref.hidePromotions, entries as { appearance: LayoutNode; performance: LayoutNode; profile: LayoutNode });
        };
    },
    stop() {
        runtime?.dispose(); runtime = undefined;
        if (originalLayout) SettingsPlugin.buildLayout = originalLayout;
        originalLayout = undefined;
        void Native.setBranding(false).catch(() => {});
    }
});
