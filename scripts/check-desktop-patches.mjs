// Validate against cached public UI factories; never run the Discord application or use an account.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';

const source = process.argv[2] ?? '.tools/discord-ui/all-modules.json';
const modules = JSON.parse(await readFile(source, 'utf8'));
const compiled = await build({ entryPoints: ['desktop/plugin/patches.ts'], bundle: true, format: 'esm', write: false });
const { focusPatches } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const checks = [], patched = new Map();
for (const patch of focusPatches) {
    const targets = Object.entries(modules).filter(([, value]) => value.code.includes(patch.find));
    assert.ok(targets.length, `Missing native component: ${patch.find}`);
    for (const [id, original] of targets) {
        let code = patched.get(id) ?? original.code;
        const matches = [];
        for (const replacement of Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement]) {
            const source = replacement.match.source.replaceAll('\\i', '[A-Za-z_$][\\w$]*');
            const regex = new RegExp(source, replacement.match.flags);
            const count = [...code.matchAll(new RegExp(source, 'g'))].length;
            assert.ok(count, `Unmatched replacement in ${id}: ${regex}`);
            matches.push(count);
            code = code.replace(regex, replacement.replace.replaceAll('$self', 'Focus'));
        }
        new vm.Script(`({${code}})`); // Syntax only; no factory executed.
        patched.set(id, code);
        checks.push({ find: patch.find, module: id, file: original.file, matches,
            sha256: createHash('sha256').update(original.code).digest('hex') });
    }
}

const profileCode = patched.get('639784');
assert.ok(profileCode, 'The validated profile fixture must be present');
const parsed = ts.createSourceFile('profile.js', `({${profileCode}})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = [];
function walk(node) {
    if (ts.isFunctionDeclaration(node)) declarations.push(node.getText(parsed));
    ts.forEachChild(node, walk);
}
walk(parsed);
const activitySource = declarations.find(code => code.includes('focusCurrentOnly'));
assert.ok(activitySource);
const live = [{ name: 'Fixture game' }], recent = [{ id: 'old-game' }];
let status = 'online', voice = { id: 'voice-fixture' };
const jsx = (type, props) => ({ type, props });
const strings = new Proxy({}, { get: (_, key) => String(key) });
// Execute the transformed native forwardRef callback. Syntax checks alone miss
// a replacement that joins `return` to the plugin identifier (returnVencord).
const guildFile = ts.createSourceFile('guilds.js', `({${patched.get('24594')}})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let unreadSource;
function findUnread(node) {
    if (ts.isFunctionExpression(node)) {
        const code = node.getText(guildFile);
        if (code.length < 3000 && code.includes('renderUnreadIndicator')) unreadSource = code;
    }
    ts.forEachChild(node, findUnread);
}
findUnread(guildFile);
assert.ok(unreadSource, 'Native unread indicator render callback must be exercised');
const folders = [{ folderId: 'fixture-folder', guildIds: ['hidden', 'visible'] }];
const nativeIndicator = 'native-unread-indicator';
const unreadRender = vm.runInNewContext(`(${unreadSource})`, {
    Focus: { renderUnreadIndicator: (Component, props) => ({ Component, props }) },
    A: { yK: (_, read) => read(), bG: (_, read) => read() },
    eF: { Ay: { getGuildFolders: () => folders } }, eK: { A: { getUnreadPrivateChannelIds: () => ['fixture-dm'] } },
    J: { default: { getStoreChangeSentinel: () => 0 } }, e3: (folders, dms) => ['null', ...dms, ...folders],
    eZ: { A: { isFocused: () => true } }, eY: { A: { getExpandedFolders: () => new Set() } },
    eW: { A: nativeIndicator }, e1: () => false, e2: () => false, es: { intl: { string: value => value }, t: strings }
});
const forwardedRef = {}, onJumpTo = () => {}, isVisible = () => false;
const indicator = unreadRender({ reverse: true, onJumpTo, isVisible }, forwardedRef);
assert.equal(indicator.Component, nativeIndicator);
assert.equal(indicator.props.ref, forwardedRef);
assert.equal(indicator.props.onJumpTo, onJumpTo);
assert.equal(indicator.props.isVisible, isVisible);
assert.equal(indicator.props.reverse, true);
assert.equal(indicator.props.items.length, 3);
const activity = vm.runInNewContext(`(${activitySource})`, {
    n: { jsx, jsxs: jsx }, k: { A: () => ({ live, recent, stream: null }) },
    T: { A: () => ({ voiceChannel: voice, voiceActivity: null }) }, p: { bG: (_, read) => read() },
    E: { A: { isFetchingUserOutbox: () => false } }, S: { A: { getStatus: () => status } }, v: { A: { getStatus: () => status } },
    A: { clD: { OFFLINE: 'offline', INVISIBLE: 'invisible' } }, B: { intl: { string: value => value }, t: strings },
    el: strings, en: { bk: { RECENT_ACTIVITY: 'recent' } }, ei: { A: 'section' }, t7: 'scroller',
    y: { A: 'game-card' }, R: { A: 'stream-card' }, w: { A: 'voice-card' }, N: { A: 'history-card' }
});
const props = { user: { id: 'other' }, currentUser: { id: 'self' }, displayProfile: {}, onClose() {}, focusCurrentOnly: true };
function cards(tree) {
    if (!tree) return [];
    if (Array.isArray(tree)) return tree.flatMap(cards);
    if (typeof tree !== 'object') return [];
    return [tree.type, ...cards(tree.props?.children)];
}
let rendered = activity(props);
assert.ok(cards(rendered).includes('game-card'));
assert.ok(cards(rendered).includes('voice-card'));
assert.ok(!cards(rendered).includes('history-card'));
assert.ok(JSON.stringify(rendered).includes('Fixture game'));
live.length = 0; voice = null;
assert.equal(activity(props), null, 'Recent games alone must not create a profile activity card');
live.push({ name: 'Fixture game' }); status = 'offline';
assert.equal(activity(props), null, 'Respect offline visibility');
status = 'invisible';
assert.equal(activity(props), null, 'Respect invisible visibility');

const tabsSource = declarations.find(code => code.includes('UserProfileModalV2Tabs'));
const tabs = vm.runInNewContext(`(${tabsSource})`, {
    g: { NJ: () => ({ trackUserProfileAction() {} }) }, f: { A: () => ({ shouldLogExposure: false }) }, h: { A() {} },
    l: { useRef: value => ({ current: value }), useEffect() {}, useState: init => [init(), () => {}] }
});
assert.equal(tabs({ user: {}, currentUser: {}, items: [] }), null, 'An own/private profile with no mutual tabs must stay usable');
const sectionCode = patched.get('761640');
const sectionFile = ts.createSourceFile('sections.js', `({${sectionCode}})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let sectionMethod;
function findSection(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(sectionFile) === 'getSection') sectionMethod = node.getText(sectionFile);
    ts.forEachChild(node, findSection);
}
findSection(sectionFile);
assert.ok(sectionMethod);
const sectionState = vm.createContext({ M: false, U: value => value, v: {}, m: { YvQ: strings }, O: false, C: true, R: false });
const getSection = vm.runInContext(`(function ${sectionMethod})`, sectionState);
assert.equal(getSection('dm', true), 'NONE');
assert.equal(getSection('guild', false), 'MEMBERS');
sectionState.M = true;
assert.equal(getSection('dm', true), 'SEARCH');
sectionState.M = false; sectionState.v.dm = {};
assert.equal(getSection('dm', true), 'SIDEBAR_CHAT');

const emojiFile = ts.createSourceFile('emoji.js', `({${patched.get('267889')}})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let emojiSectionSource;
function findEmojiSection(node) {
    if (ts.isFunctionDeclaration(node) && node.getText(emojiFile).includes('focusEmoji') && node.getText(emojiFile).length < 4000)
        emojiSectionSource = node.getText(emojiFile);
    ts.forEachChild(node, findEmojiSection);
}
findEmojiSection(emojiFile);
assert.ok(emojiSectionSource, 'Exercise the actual patched native emoji grid section');
const emojiContext = vm.createContext({
    i: new Set(), O: new Set(), f: 3, R: 9, d: 32, t: { id: 'fixture-channel' }, r: 'chat',
    ev: () => ({ partition: (items, predicate) => [items.filter(predicate), items.filter(item => !predicate(item))] }),
    eA: { Ay: { getEmojiUnavailableReason: ({ emoji, intention }) => emoji.reasons?.[intention] ?? null,
        isEmojiDisabled: ({ emoji, intention }) => !!emoji.reasons?.[intention] } },
    eq: { s: { TOP_GUILD_EMOJI: 'top' }, tm: { NONE: 'none' } }
});
const emojiSection = vm.runInContext(`(${emojiSectionSource})`, emojiContext);
const regularEmoji = { name: 'unicode' }, localEmoji = { name: 'local' };
const lockedEmoji = { name: 'locked', reasons: { chat: 'premium', reaction: 'premium' } };
const reactionEmoji = { name: 'reaction', reasons: { chat: 'external' } };
const emojiCases = [];
function checkEmojiGrid(name, input, expected, intention = 'chat') {
    const originalInput = [...input];
    Object.assign(emojiContext, { e: [], n: [], s: [], u: [], E: 0, _: 0, r: intention });
    emojiSection(input, { sectionId: name, type: name, isNitroLocked: true, guild: { id: 'fixture' } });
    assert.deepEqual(Array.from(emojiContext.s).flat().map(item => item.emoji), expected);
    assert.equal(emojiContext.n.length, expected.length ? 1 : 0, 'No empty headers');
    if (expected.length) {
        assert.equal(emojiContext.n[0].count, expected.length);
        assert.equal(emojiContext.n[0].isNitroLocked, false);
    }
    assert.equal(emojiContext.s.length, Math.ceil(expected.length / 3), 'No gaps in virtual rows');
    assert.deepEqual(input, originalInput, 'Filtering must not mutate the native emoji inventory');
    emojiCases.push(name);
}
const mixedEmoji = [regularEmoji, lockedEmoji, localEmoji, reactionEmoji];
checkEmojiGrid('mixed category', mixedEmoji, [regularEmoji, localEmoji]);
assert.equal(mixedEmoji.length, 4);
checkEmojiGrid('all locked', [lockedEmoji], []);
checkEmojiGrid('search results', [lockedEmoji, regularEmoji], [regularEmoji]);
checkEmojiGrid('reaction permissions', [lockedEmoji, reactionEmoji], [reactionEmoji], 'reaction');
checkEmojiGrid('unicode only', [regularEmoji], [regularEmoji]);
const modalFile = ts.createSourceFile('profile-modal.js', `({${patched.get('808261')}})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let editorExpression;
function findEditor(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(modalFile) === 'focusEditor') editorExpression = node.initializer.getText(modalFile);
    ts.forEachChild(node, findEditor);
}
findEditor(modalFile);
assert.ok(editorExpression, 'Native editor must be passed into the profile card');
const editorHandlers = { select() {}, close() {}, ref: {} };
const editorContext = vm.createContext({ es: true, t: { jsx }, iY: 'native-profile-editor', J: 'selected-guild', d: 'origin-guild',
    ee: editorHandlers.select, e0: editorHandlers.close, eF: editorHandlers.ref, Q: false, el: false });
const inlineEditor = vm.runInContext(editorExpression, editorContext);
assert.equal(inlineEditor.type, 'native-profile-editor');
assert.equal(inlineEditor.props.selectedGuildId, 'selected-guild');
assert.equal(inlineEditor.props.onSelectGuildId, editorHandlers.select);
assert.equal(inlineEditor.props.onClose, editorHandlers.close);
editorContext.es = false;
assert.equal(vm.runInContext(editorExpression, editorContext), false, 'Never expose editing controls on a non-editable profile');
await mkdir('artifacts/test-results', { recursive: true });
await writeFile('artifacts/test-results/desktop-patches.json', JSON.stringify({ passed: true, publicSourceOnly: true,
    liveAccountTested: false, checks, nativeActivityCases: ['live game and voice', 'no history', 'no empty card', 'offline', 'invisible', 'empty profile tabs'],
    sidebarCases: ['no DM profile', 'keep members', 'keep search', 'keep threads'], nativeUnreadRenderExecuted: true, emojiCases,
    inlineEditor: { nativeCallbacksPreserved: true, readOnlyProfilesProtected: true } }, null, 2));
console.log(`Native boundaries: ${checks.length} validated; unread callback, 6 profile, 4 sidebar and ${emojiCases.length} emoji cases passed.`);
