import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const catalog = JSON.parse(await readFile('desktop/audit/settings-keys.json', 'utf8'));
const compiled = await build({ entryPoints: ['desktop/plugin/settingsPolicy.ts'], bundle: true, format: 'esm', write: false });
const { assessSetting } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const entries = catalog.keys.map(({ key, symbol }) => ({ key, symbol, ...assessSetting(key) }));
const counts = Object.fromEntries(['keep', 'remove', 'replace', 'performance'].map(kind => [kind, entries.filter(entry => entry.decision === kind).length]));
await writeFile('desktop/audit/settings-audit.json', JSON.stringify({ source: catalog.source, date: catalog.date, counts, entries }, null, 2) + '\n');
const labels = { keep: 'Conservé', remove: 'Retiré', replace: 'Remplacé par Focus', performance: 'À ajuster selon usage' };
await writeFile('docs/SETTINGS_AUDIT.md', `# Audit des paramètres Discord dans Focus

Inventaire du ${catalog.date} : **${entries.length} identifiants** (options, catégories et navigation) relevés dans le [bundle public Discord](${catalog.source}). Les expériences et la plateforme peuvent modifier les options réellement affichées. Les paramètres inconnus restent accessibles par défaut.

${Object.entries(counts).map(([key, count]) => `- ${labels[key]} : ${count}`).join('\n')}

Le classement provient de **desktop/plugin/settingsPolicy.ts**, utilisé par la navigation réelle. Les sous-arbres retirés ne sont pas rendus. Il ne s'agit pas d'une mesure CPU/RAM : enlever un onglet ne désactive pas sa fonction en arrière-plan.

Les promotions, offres de thèmes, badges cadeaux décoratifs et modes fantaisie sont retirés. Les sélecteurs de thème et d'icône remplacés par Focus disparaissent pour éviter les réglages contradictoires.

Les fonctions potentiellement coûteuses gardent leur bouton de désactivation : capture Clips et capture automatique, overlay en jeu, effets de caméra, traitements audio, animations et partage d'écran. Elles restent accessibles dans Performances ou Audio et vidéo. L'accélération matérielle reste réglable : la désactiver peut augmenter la charge CPU. Aucun changement silencieux des réglages audio, de capture, de confidentialité ou de consentement.

Les achats déjà effectués, factures, abonnements et annulations, sécurité du compte, appareils, suppression du compte, blocage, protection contre le spam et accessibilité restent accessibles. Les choix de confidentialité concernant les quêtes sont conservés. Le mode développeur normal et les diagnostics utiles sont conservés ; les outils expérimentaux internes sont retirés de la navigation simplifiée.

La version actuelle retire aussi le montage des composants du bandeau de quête et du panneau En ligne. Elle place uniquement les cartes d'activité en cours dans le profil. Ces changements empêchent les effets de ces composants de démarrer ; ils ne désactivent pas tous les services internes de Discord.

| Identifiant natif | Décision |
| --- | --- |
${entries.map(entry => `| \`${entry.key}\` | ${labels[entry.decision]} |`).join('\n')}
`);
console.log(JSON.stringify({ identifiers: entries.length, counts }));
