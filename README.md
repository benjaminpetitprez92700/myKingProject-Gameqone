# The King Game Arena

Appli de jeux pour mobile (web pour l'instant, Android ensuite). Au lancement, une intro animée, puis un menu
avec 5 jeux. Les profils (nom + couleur) et toute la progression sont sauvegardés sur l'appareil.

| Jeu | Principe | Modes |
| --- | --- | --- |
| **Mini Golf** | Mettre la balle dans le trou en passant ponts, bosses, creux, pentes, sable, plots, moulins et pistons | 3 difficultés × 5 parcours, étoiles et records |
| **Pogs** | Viser la pile, doser la frappe du kini : les pogs qui retombent face visible sont gagnés | Contre l'ordi (3 niveaux) ou à deux |
| **Billard américain** | 8-ball : empocher ses billes (pleines ou rayées) puis la noire | Contre l'ordi (3 niveaux) ou à deux |
| **Serpent** | Manger des billes qui s'ajoutent à la queue, sans toucher le cadre, les murs ni soi-même | 10 niveaux (vitesse et obstacles croissants) + mode infini |
| **Pétanque** | Tête-à-tête 3 boules : roulette, demi-portée, plombée ou tir, jauge de précision | Contre l'ordi ou à deux, en 7 ou 13 points |

## Commandes

| Action | Commande |
| --- | --- |
| Jouer dans le navigateur | `npm run serve` puis ouvrir http://localhost:8080 |
| Vérifier que tous les parcours de mini golf sont gagnables | `npm run verify` |
| Copier le jeu dans le projet Android | `npx cap sync android` |

L'APK Android et l'IPA iPhone sont compilés automatiquement par GitHub Actions à chaque push (onglet **Releases**).
L'APK est toujours signé avec la même clé (`android/app/kinggamearena.keystore`) : chaque version s'installe par-dessus la précédente.
L'IPA n'est pas signée par Apple : installation via Sideloadly ou AltStore (identifiant Apple gratuit), ou TestFlight avec un compte Apple Developer.

## Structure

- `www/js/app.js` – écrans, navigation, menu des jeux
- `www/js/intro.js` – intro animée
- `www/js/storage.js` – profils et sauvegarde
- `www/js/fx.js` – sons synthétisés et vibrations
- `www/js/minigolf/` – physique, parcours, rendu du mini golf
- `www/js/billard/` – table (physique pure), règles, IA et rendu du billard
- `www/js/petanque/` – pétanque
- `www/js/pog/` – pogs
- `www/js/snake/` – serpent
- `android/` – projet Android natif (Capacitor)
