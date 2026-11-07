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
| Ouvrir l'arbre | Tab | Bouton ARBRE |
| Pause | Échap ou P | Bouton II |
| Couper le son | M | Menu Options |

Dans l'arbre, à la souris : clic pour acheter, Maj+clic pour acheter au maximum, molette pour zoomer, glisser pour se déplacer.

## Le jeu

- **Vol :** chaque secteur dure 60 secondes, puis un boss arrive. Le vaincre ouvre le secteur suivant, plus difficile.
- **Monnaies :** les unités viennent des ennemis, les noyaux des boss et des élites, la matière noire de l'hypersaut.
- **Arbre :** 154 compétences réparties en 8 branches (Armement, Missiles, Énergie, Drones, Blindage, Propulsion, Collecte, Tactique), avec des synergies entre branches voisines.
- **Hypersaut :** après le boss du secteur 10, on peut remettre l'arbre à zéro contre de la matière noire. Elle se dépense dans la Constellation, 33 compétences permanentes.

La progression est enregistrée dans le navigateur.

## Technique

HTML, CSS et JavaScript, sans dépendance ni étape de compilation. Les sprites sont dessinés dans le code et le son est synthétisé dans le navigateur.

## Crédits

Polices [VT323](https://fonts.google.com/specimen/VT323) et [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), sous licence SIL Open Font License : les licences sont dans le dossier `fonts/`.
