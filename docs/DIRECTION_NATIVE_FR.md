# Orientation retenue : intégration à Discord Desktop

La précision utilisateur du 23 septembre 2026 retient une modification intégrée au client Desktop : Discord apparaît comme Focus, avec son thème, ses options et un masquage effectif des éléments inutiles.

La version 0.2 est implémentée dans `desktop/plugin` et compilée avec Vencord. Elle utilise les paramètres et menus du client installé, filtre le rendu des serveurs et ajoute une politique locale de présentation et de médias. Elle ne lance pas Discord Web dans une seconde application.

La connexion et les appels restent ceux du client Discord. Aucun backend Discord privé, self-bot ou accès aux jetons du compte n'est ajouté. Les modifications locales de l'interface sont non officielles et peuvent demander une adaptation après une mise à jour de Discord.

Voir [le guide actuel](../desktop/README.md) et [les vérifications effectuées](DESKTOP_VALIDATION.md). Le travail Tauri/WebView2 et sa documentation sont historiques ; il ne constitue plus l'architecture poursuivie.