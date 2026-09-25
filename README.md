# Focus

Focus est désormais intégré à **Discord Desktop**, via un module Vencord compilé dans le client. L'interface utilise le nom Focus, des thèmes monochromes et des réglages locaux. Le client Discord conserve ses messages, sa connexion et ses appels.

Le raccourci **Focus** est installé sur le Bureau et dans le menu Démarrer. L'intégration est non officielle et réversible.

- Clic droit sur un serveur, un ami ou un DM → **Masquer dans Focus**.
- Paramètres → **Apparence** → thèmes, promotions, éléments masqués et restauration.
- Paramètres → **Performances** → animations, médias et moniteur des processus.
- Six catégories regroupent les réglages intégrés ; les contrôles Discord restent ceux du client.

Le masquage retire la ligne complète et les miniatures des serveurs dans les dossiers. Le bandeau de quêtes et le panneau « En ligne » ne sont plus montés ; le panneau de profil dans les DM est retiré. L'activité en cours apparaît dans la carte du profil complet, sans onglet Tableau ou Activité. Les entrées commerciales et leurs sous-options sont filtrées dans l'arbre des paramètres, en conservant les consentements et la gestion des abonnements.

```powershell
pnpm build
pnpm test
pnpm test:desktop
pnpm desktop:install
# Retour au client standard, après fermeture de Discord :
pnpm desktop:remove
```

Le paquet se trouve dans `artifacts/desktop/Focus`. Les commandes `Installer Focus.cmd` et `Desinstaller Focus.cmd` permettent de l'utiliser sans environnement Node.js sur la machine cible, où Discord Desktop doit être installé.

- [Guide et limites de l'intégration](desktop/README.md)
- [Résultats de validation](docs/DESKTOP_VALIDATION.md)
- [Audit des 478 identifiants de paramètres](docs/SETTINGS_AUDIT.md)
- [Code du module](desktop/plugin/index.tsx)
- [Révision Vencord et empreinte des sources](desktop/upstream.json)

Les tests automatisés du masquage portent sur des interfaces de test. Les parcours authentifiés et les appels restent à valider. Aucun gain mémoire/CPU n'est revendiqué sans benchmark.

L'ancien prototype Tauri/WebView2 reste archivé dans `src` et `src-tauri` : [documentation historique](docs/LEGACY_WEBVIEW2.md). `pnpm dev:legacy` et `pnpm build:legacy` lui sont réservés. Son exécutable et son installeur 0.1 ne sont pas la nouvelle version Focus.
