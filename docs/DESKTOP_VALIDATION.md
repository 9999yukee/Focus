# Validation de Focus Desktop 0.2

Les tests de l'ancien prototype WebView2 ne valident pas cette intégration.

Vérifications effectuées les 23 et 24 septembre 2026 :

| Vérification | Résultat |
| --- | --- |
| Vérification TypeScript dans les sources Vencord épinglées | Réussie |
| Compilation Discord Desktop, mise à jour Vencord désactivée | Réussie |
| ESLint, incluant le module Focus | Réussi |
| Tests unitaires | 19 réussis, dont 10 propres à l'intégration Desktop |
| Tests Chromium de masquage | 8 groupes réussis sur fixtures contrôlées |
| Points d'intégration des composants natifs | 8 validés sur les sources publiques : correspondances et syntaxe du code transformé |
| Régression de l'indicateur NOUVEAU | Le callback natif transformé est exécuté en test : reproduisait `returnVencord is not defined` avant correction, passe après correction, conserve références et commandes natives |
| Activité native du profil, avec données synthétiques | Jeu et vocal conservés, historique retiré, pas de carte vide, visibilité hors ligne/invisible respectée, profil sans onglets géré |
| Sélection native des panneaux, avec données synthétiques | Profil DM retiré ; recherche, fils de discussion et liste des membres conservés |
| Audit des paramètres | 478 identifiants classés ; voir SETTINGS_AUDIT.md |
| Installation dans Discord Desktop officiel | Réussie, fichiers sauvegardés |
| Désinstallation | Réussie ; SHA-256 du `app.asar` original identique après restauration |
| Réinstallation | Réussie |
| Mise à jour native Discord 1.0.9059 → 1.0.9258 | Chargeur Focus conservé |
| Démarrage dans Discord Desktop 1.0.9258 | Module Focus démarré, style chargé, fenêtre et document nommés Focus |
| Connexion standard | Formulaire Discord observé lors du premier contrôle ; aucun identifiant saisi |
| Mesures natives Electron | Réponse reçue, mémoire finie et nombre de processus strictement positif |
| Démarrage après correction du plantage | Navigation et contrôles du compte réellement montés ; aucun écran de plantage ni erreur de rendu pendant le contrôle |
| Paramètres Focus dans la session ouverte | Page Apparence ouverte, trois boutons de thème présents, fermeture réussie ; aucun réglage modifié |
| Profils, quêtes et masquage de serveurs dans la session réelle | Parcours complets non validés ; tests de composants et données synthétiques uniquement |
| Audio, vidéo, partage d'écran | Non validés en appel |
| Comparaison mémoire/CPU | Non mesurée |

Les fixtures vérifient la hauteur nulle des lignes entières, les dossiers contenant un frère visible, les badges et conteneurs de DM, les amis, l'UID variable de la navigation commerciale, les paramètres audio/facturation préservés, la fermeture d'une quête avec son arrière-plan, la préservation des dialogues ordinaires, les lignes DOM recyclées, les montages ultérieurs, la restauration et l'arrêt du filtre.

Les tests unitaires vérifient aussi que l'indicateur de défilement « NOUVEAU » ne reçoit plus les serveurs et conversations masqués, y compris dans les dossiers fermés. Les états de lecture natifs et les notifications système ne sont pas modifiés.

Rapports générés : `artifacts/test-results/desktop.json`, `desktop-patches.json` et `desktop-startup.json`. Ce dernier décrit le contrôle antérieur du démarrage. Les nouveaux tests utilisent des interfaces et données synthétiques ; ils ne constituent pas une validation visuelle dans le compte connecté. Le contrôle des patches vérifie les fabriques publiques sans démarrer l'application ni appeler les services du compte ; les seules fonctions de rendu exécutées reçoivent des dépendances de test.

Le rapport `desktop-render-startup.json` décrit le contrôle réel effectué après le plantage signalé le 24 septembre. Les vérifications antérieures du titre et du chargement du module étaient insuffisantes : elles pouvaient réussir avant que le rendu principal plante. Le contrôle actuel attend le montage de la navigation et des commandes du compte, observe les erreurs de rendu, puis vérifie que ces éléments restent présents. Le signal volontaire exact « Sentry successfully disabled » de NoTrack est exclu ; les autres erreurs restent signalées. Ce contrôle ne lit ni messages, ni jetons, ni données de connexion.

`pnpm test:patches` nécessite le cache local `.tools/discord-ui/all-modules.json` issu des assets publics indiqués dans le rapport, ou son chemin en argument du script. Ce cache n'est pas livré avec Focus. Les tests unitaires et Chromium sont autonomes. `pnpm audit:settings` régénère l'audit à partir de l'inventaire inclus et de la politique réellement utilisée par le module.

Le contrôle du démarrage consulte uniquement les états du module, les titres de fenêtre et les commandes connues de l'interface. Aucun mot de passe, jeton, cookie, QR de connexion ou contenu de message n'est extrait.
