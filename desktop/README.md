# Focus dans Discord Desktop

Focus 0.2 est un module local compilé avec Vencord, chargé dans **Discord Desktop officiel**. Le raccourci Focus lance ce client. Il n'ouvre ni navigateur ni fenêtre Tauri/WebView2 supplémentaire. Les messages, les connexions et les appels restent gérés par Discord. L'intégration est non officielle.

Le thème monochrome concerne les fonds, textes et contrôles de l'interface. Les avatars, images et vidéos conservent leurs couleurs ; aucun filtre noir et blanc n'est appliqué aux contenus.

## Utilisation

- Lancez **Focus** depuis le Bureau ou le menu Démarrer.
- Connectez-vous avec l'écran habituel de Discord si nécessaire.
- Ouvrez les paramètres : **Apparence** contient les thèmes, le masquage des promotions et la liste des éléments masqués ; **Performances** contient les politiques de médias et le moniteur.
- Clic droit sur un serveur, un ami ou une conversation → **Masquer dans Focus**. Pour annuler : Apparence → Éléments masqués → Réafficher.
- Les catégories principales sont Compte, Audio et vidéo, Notifications, Confidentialité, Apparence et Performances. Les actions utilitaires, dont la déconnexion, restent accessibles. Désactiver « Paramètres simplifiés », puis rouvrir les paramètres, rétablit leur organisation habituelle.
- Les panneaux de droite « En ligne » et de profil dans les DM sont retirés. Les profils restent accessibles en cliquant sur un avatar.
- Le profil complet affiche l'activité en cours directement dans la carte, avec les actions natives. Les onglets Tableau, Activité et liste de souhaits sont retirés ; les liens en commun restent accessibles. L'historique d'activité n'est pas affiché.

Les préférences sont enregistrées par Vencord sous `%APPDATA%\Vencord\settings\settings.json`, dans `plugins.Focus.preferences`. Ce fichier ne contient pas le jeton de session Discord. Focus ne lit pas les cookies, mots de passe, stockage d'authentification ou données réseau du compte.

## Construction et installation

Depuis la racine du projet, avec Node.js et pnpm :

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm test:desktop
pnpm desktop:install
```

Fermez Discord avant une installation ou une mise à jour du module. Le script refuse d'interrompre un client en cours d'exécution. Vesktop est indépendant et n'est pas modifié.

La construction télécharge les sources Vencord à la révision de `upstream.json`, vérifie leur SHA-256, copie `desktop/plugin` dans `src/userplugins/focus`, effectue la vérification TypeScript, puis compile. La mise à jour automatique de **Vencord** est désactivée à la compilation pour conserver le module personnalisé ; le système de mise à jour de **Discord** reste actif.

Le paquet est produit dans `artifacts/desktop/Focus`. Les scripts d'installation vérifient les fichiers compilés, sauvegardent le chargeur existant et les éventuels raccourcis, puis utilisent l'installateur officiel Vencord 1.4.2 dont le SHA-256 est épinglé. Les fichiers actifs sont placés dans `%LOCALAPPDATA%\FocusDesktop`, sans dépendre du dossier de développement. Les sauvegardes restent sous `FocusDesktop\backups`.

## Retour à Discord

Fermez Discord, puis :

```powershell
pnpm desktop:remove
```

Le désinstallateur rétablit le client Discord standard et retire les raccourcis créés par Focus. Il conserve les préférences et sauvegardes locales. Une autre modification préexistante du chargeur, le cas échéant, reste dans la sauvegarde : elle n'est pas automatiquement réinstallée.

## Portée exacte

Le module apporte du code intégré aux paramètres et aux menus contextuels, un filtre de rendu des serveurs, un thème et des politiques locales. Le filtre de rendu s'appuie sur le point d'intégration utilisé par BetterFolders dans la révision Vencord épinglée. Les conteneurs complets sont aussi masqués dans le document lorsqu'un élément est déjà monté ou que ce point d'intégration change.

Le composant natif du bandeau de quêtes, y compris les récompenses terminées, n'est plus monté lorsque les promotions sont masquées. Le panneau d'activité des amis n'est plus monté. Des sélecteurs de secours reconnaissent les promotions restantes par leurs attributs, identifiants et classes. Une fenêtre de quête reconnue est fermée avec son bouton existant : cela libère son arrière-plan et son piège de focus. Une fenêtre inconnue ou sans commande de fermeture identifiable reste utilisable. Focus ne prétend pas supprimer tous les traitements réseau ou la mémoire des fonctionnalités masquées.

Le regroupement des paramètres filtre les entrées et leurs sous-options avant le rendu. Les contrôles de thèmes remplacés par Focus disparaissent. La facturation, les abonnements, leur gestion et les consentements publicitaires sont conservés. Les fonctions potentiellement coûteuses gardent leurs commandes de désactivation. L'[audit complet](../docs/SETTINGS_AUDIT.md) détaille les 478 identifiants examinés. Les sélecteurs de secours ne ciblent pas les liens contenus dans les messages.

Le filtre des serveurs retire également leurs miniatures dans les dossiers ; un dossier entièrement masqué disparaît. L'indicateur « NOUVEAU » en haut ou en bas de la liste exclut les serveurs et conversations masqués et conserve les alertes des éléments visibles. Les mises à jour de Discord peuvent changer ces points d'intégration. Les résultats de recherche et les notifications système ne sont pas garantis masqués. Un ami masqué ne masque pas automatiquement toutes ses conversations : masquez aussi la conversation concernée. Il n'y a pas encore de compteur fiable des nouveaux messages masqués.

Les vidéos d'appels, les pistes audio, WebRTC et la connexion vocale sont exclus du gestionnaire de médias. La virtualisation des messages reste celle de Discord ; le laboratoire de viewport de l'ancien prototype n'est pas présenté comme un moteur installé. Aucun gain de RAM ou CPU n'est annoncé sans mesures comparatives.

## Sources et licence

- [Vencord : modules personnalisés](https://docs.vencord.dev/installing/custom-plugins/)
- [Sources Vencord épinglées](https://github.com/Vendicated/Vencord/tree/59a54286542651fff5ea53f0ce6cadf2a6aa7521)
- [Installateur Vencord 1.4.2](https://github.com/Vencord/Installer/releases/tag/v1.4.2)

Le module de `desktop/plugin` est distribué sous GPL-3.0-or-later. Le paquet inclut la licence Vencord et ses sources exactes. Voir aussi [les vérifications effectuées](../docs/DESKTOP_VALIDATION.md).
