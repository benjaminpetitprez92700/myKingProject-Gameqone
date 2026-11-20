# Calot – le jeu de billes

Jeu mobile de billes : pousse ta bille d'une pichenette le long du parcours, franchis les **ponts**, les **bosses**,
les creux, les pentes et les obstacles (plots, rondins, moulins, pistons) et **touche le calot** au bout du parcours
avec le moins de coups possible.

- 3 difficultés (Facile, Moyen, Difficile) × 5 parcours. Une difficulté se débloque quand on finit la précédente.
- Facile : trajectoire complète affichée. Moyen : début de trajectoire. Difficile : direction seulement, moins de coups.
- Jusqu'à 6 **profils** (nom + couleur de bille), chacun avec sa progression, ses étoiles, ses records et ses réglages
  (son, vibrations). Tout est sauvegardé sur le téléphone.
- 1 à 3 étoiles selon le nombre de coups par rapport au par. Sortir de la piste = +1 coup.

## Commandes

| Action | Commande |
| --- | --- |
| Jouer dans le navigateur (test rapide) | `npm run serve` puis ouvrir http://localhost:8080 |
| Vérifier que tous les niveaux sont gagnables | `npm run verify` |
| Copier le jeu dans le projet Android | `npx cap sync android` |
| Compiler l'APK (Android Studio / SDK requis) | `cd android && ./gradlew assembleDebug` |

L'APK est aussi compilé automatiquement par GitHub Actions à chaque push (onglet **Actions**, et une **Release**
avec `Calot.apk` à télécharger depuis le téléphone).

## iPhone

Le projet est fait avec Capacitor : `npm i @capacitor/ios && npx cap add ios`, puis ouvrir dans Xcode
(Mac + compte développeur Apple nécessaires).

## Structure

- `www/js/physics.js` – moteur physique (roulement, bosses, pentes, sable, collisions, calot)
- `www/js/levels.js` – les parcours et les difficultés
- `www/js/game.js` – rendu, caméra, visée tactile, effets
- `www/js/storage.js` – profils et sauvegarde (stockage natif + localStorage)
- `www/js/fx.js` – sons synthétisés et vibrations
- `www/js/main.js` – écrans et navigation
- `android/` – projet Android natif (Capacitor)
