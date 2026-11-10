# SPACE X

Jeu de vaisseau à l'ancienne, vu de haut, et incrémental : les ennemis arrivent de partout, chaque épave rapporte des unités, et ces unités font grandir un immense arbre de compétences.

**Jouer en ligne : https://manceau-aurelien.github.io/space-x/**

Le jeu fonctionne aussi sans installation : il suffit d'ouvrir `index.html`. Sur téléphone, la version en ligne peut être ajoutée à l'écran d'accueil et reste jouable hors connexion.

## Commandes

| Action | Clavier | Tactile |
|---|---|---|
| Piloter | ZQSD ou flèches | Glisser le doigt |
| Tirer | Automatique (visée souris en option) | Automatique |
| Saut, une fois débloqué | Espace ou Maj | Bouton SAUT |
| Ouvrir l'arbre, au hangar | Tab | Bouton ARBRE |
| Pause | Échap ou P | Bouton II |
| Couper le son | M | Menu Options |

Dans l'arbre, à la souris : clic pour acheter, Maj+clic pour acheter au maximum, molette pour zoomer, glisser pour se déplacer.

## Jouer à deux en ligne

Depuis le menu, choisissez **Jouer à deux en ligne** : l'un crée la partie, l'autre entre le code à 4 caractères ou ouvre le lien copié. Chacun joue sur son appareil et garde sa propre progression.

- Les ennemis sont plus nombreux et plus résistants, et chaque orbe ramassé profite aux deux joueurs.
- Un vaisseau détruit reste à terre : son coéquipier le répare en restant dans son cercle 3 secondes, puis 6, 12, 24… pour les réparations suivantes du même vol. Sinon, il revient au secteur suivant. Le vol s'arrête quand les deux sont à terre.
- Ouvrir le menu pause arrête la partie pour les deux.
- Pour décoller, chacun clique sur **JE SUIS PRÊT** : le vol part quand les deux le sont. C'est l'hôte qui choisit le secteur de départ.

La liaison est directe entre les deux appareils. Le service gratuit [PeerJS](https://peerjs.com) sert à vous mettre en relation, et ses serveurs relaient les échanges si la liaison directe est impossible : chaque appareil voit donc l'adresse IP de l'autre ou celle du relais, et certains réseaux peuvent bloquer la connexion.

## Le jeu

- **Vol :** chaque secteur dure 60 secondes, puis un boss arrive. Le vaincre ouvre le secteur suivant, plus difficile. À partir du secteur 5, les boss ont 3 fois plus de vie et attaquent 2 fois plus vite. À partir du secteur 10, deux boss arrivent en même temps.
- **Hangar :** l'arbre ne s'améliore qu'entre deux vols, une fois détruit ou rentré au hangar.
- **Points de passage :** tous les 5 secteurs atteints (5, 10, 15…), on peut repartir directement de là, depuis le hangar ou l'écran de bilan. Ils repartent de zéro après un hypersaut, avec le record.
- **Monnaies :** les unités viennent des ennemis, les noyaux des boss et des élites, la matière noire de l'hypersaut.
- **Arbre :** 226 compétences réparties en 8 branches (Armement, Missiles, Énergie, Drones, Blindage, Propulsion, Collecte, Tactique), avec des synergies entre branches voisines. Les plus lointaines n'ouvrent qu'après 1 ou 2 hypersauts.
- **Hypersaut :** après le boss du secteur 3, on peut remettre l'arbre à zéro contre de la matière noire. Elle se dépense dans la Constellation, 57 compétences permanentes.

Autant de sauvegardes nommées que l'on veut (menu **Sauvegardes**) : pratique pour garder une partie par coéquipier.

La progression est enregistrée dans le navigateur, et protégée par `save-guard.js` :

- le jeu demande au navigateur de ne pas effacer ses données de lui-même (stockage persistant) ;
- un onglet resté ouvert avec une ancienne progression ne peut plus écraser une sauvegarde plus récente : il se recharge à la place ;
- des copies de secours sont gardées, et rendues automatiquement si la sauvegarde est abîmée ;
- dans **Sauvegardes** ou **Options**, **Exporter un fichier** ou **Copier le code** met la progression de côté, et **Importer** la restaure, y compris sur un autre appareil.

Chaque adresse a sa propre sauvegarde : le fichier ouvert par double-clic, le site en ligne et, sur iPhone, l'icône de l'écran d'accueil ne partagent pas la même. Pour passer de l'une à l'autre, exportez puis importez.

## Technique

HTML, CSS et JavaScript, sans étape de compilation. La seule bibliothèque externe, PeerJS, est incluse dans le dépôt pour le mode en ligne. Les sprites sont dessinés dans le code et le son est synthétisé dans le navigateur.

## Crédits

Connexion en ligne : [PeerJS](https://github.com/peers/peerjs), sous licence MIT (`js/vendor/`).

Polices [VT323](https://fonts.google.com/specimen/VT323) et [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), sous licence SIL Open Font License : les licences sont dans le dossier `fonts/`.
