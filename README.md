# 🎯 DartsMa - Live Darts Match & Camera Motion Capture

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/2lmotors/DartsMa)

Application de match de fléchettes en direct et à distance avec flux vidéo (style **Dartsmind**), système de lobby, attribution automatique de pseudo, et **détection de flèches par vision caméra (Motion Capture)**.

---

## 🚀 Démarrage Rapide

### 1. Lancement du Serveur
```bash
# Lancer le serveur backend temps réel (port 4000)
npm run server

# Dans un autre terminal, lancer le client mobile/web (port 5173)
npm run client
```

### 2. Accès sur Smartphone & Tablette (Android / iOS)
Votre machine et vos appareils doivent être connectés au même réseau Wi-Fi.

Ouvrez simplement le navigateur de votre smartphone ou tablette à l'adresse :
```
http://192.168.1.51:5173
```
*(ou `http://localhost:5173` depuis votre ordinateur)*

---

## 🎯 Fonctionnalités Clés

1. **Lobby & Salle d'Attente Automatique** :
   - Pseudo attribué automatiquement dès la connexion (ex: *Fleche_482*), modifiable en un clic.
   - Liste des joueurs connectés en temps réel avec statut (*Prêt à jouer* / *En match*).
   - Envoi de défi instantané en **501** ou **301**.
   - Modal d'acceptation / refus chez l'adversaire.

2. **Match en Direct & Visio (WebRTC)** :
   - Écran partagé optimisé mobile/tablette.
   - **Vue de la cible adverse** en direct via WebRTC.
   - **Tableau des scores** grand format avec historique des 3 flèches du tour, moyenne à 3 flèches et suggestions de sortie (Checkout).
   - Annonce vocale des scores et bruitages d'impact synthétisés.

3. **Motion Capture & Détection par Caméra** :
   - Prise en charge de la **caméra avant (selfie)** ou **arrière** avec bascule en 1 tap.
   - **Mode Calibrage** : interface de réglage pour positionner et redimensionner le cercle de détection exactement sur votre cible physique.
   - **Détection différentielle d'impacts (Frame Differencing)** : calcule automatiquement les coordonnées polaires de l'impact et identifie la zone (Simple, Double, Triple, Bull, Miss).
   - **Pavé numérique de secours / correction** : permet à tout moment de corriger ou saisir manuellement en cas de faux positif ou de luminosité faible.

---

## 📱 Export vers Android & iOS (Capacitor)

Pour transformer cette application en fichier `.apk` Android ou en projet iOS natif :
```bash
cd client
npm install @capacitor/core @capacitor/cli @capacitor/camera
npx cap init DartsMa com.dartsma.app --web-dir dist
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
```

