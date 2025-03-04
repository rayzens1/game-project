// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Fonction pour générer une couleur à partir d'un pseudo
function getColorFromPseudo(pseudo) {
  let hash = 0;
  for (let i = 0; i < pseudo.length; i++) {
    hash = pseudo.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // On utilise HSL pour obtenir une couleur vive (70% de saturation et 50% de luminosité)
  return `hsl(${hue}, 70%, 50%)`;
}

const players = {};

// Fonction de détection de collision entre deux joueurs avec une zone carrée (boxSize)
function isColliding(playerA, playerB, boxSize) {
  const half = boxSize / 2;
  const ax = playerA.x - half;
  const ay = playerA.y - half;
  const bx = playerB.x - half;
  const by = playerB.y - half;
  return ax < bx + boxSize &&
         ax + boxSize > bx &&
         ay < by + boxSize &&
         ay + boxSize > by;
}

// Vérification des collisions et émission aux clients
function checkCollisions(boxSize) {
  const collisions = []; // Tableau des paires en collision
  const ids = Object.keys(players);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const playerA = players[ids[i]];
      const playerB = players[ids[j]];
      if (isColliding(playerA, playerB, boxSize)) {
        collisions.push({ a: playerA.id, b: playerB.id });
      }
    }
  }
  // Envoie de la liste des collisions à tous les clients
  io.emit('collisionUpdate', collisions);
}

// Appel périodique de la fonction de détection
setInterval(() => checkCollisions(50), 50);




io.on('connection', (socket) => {
  console.log('Nouvelle connexion:', socket.id);
  
  // Attente de la soumission du pseudo
  socket.on('joinGame', (pseudo) => {
    console.log(`🤖 Nouveau joueur - ${pseudo} - id ${socket.id}`);
    // Générer une couleur en fonction du pseudo
    const color = getColorFromPseudo(pseudo);
    // Créer l'objet joueur avec une position de départ et le pseudo et la couleur associée
    players[socket.id] = { id: socket.id, x: 375, y: 275, name: pseudo, color: color };
    // Envoyer la liste de tous les joueurs au nouveau joueur
    socket.emit('currentPlayers', players);
    // Informer les autres joueurs de l'arrivée d'un nouveau joueur
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Lorsque le joueur se déplace, mettre à jour sa position et la diffuser
    socket.on('playerMovement', (movementData) => {
      if (players[socket.id]) {
        const newX = movementData.x;
        const newY = movementData.y;
        let collisionDetected = false;

        // Vérifier la collision avec tous les autres joueurs
        for (const otherId in players) {
          if (otherId !== socket.id) {
            const testPlayer = { x: newX, y: newY, id: socket.id };
            if (isColliding(testPlayer, players[otherId], 50)) {
              collisionDetected = true;
              console.log(`Collision détectée : Joueur ${socket.id} avec Joueur ${otherId}. Déplacement annulé.`);
              break;
            }
          }
        }
        // Mise à jour de la position uniquement s'il n'y a pas de collision
        if (!collisionDetected) {
          players[socket.id].x = newX;
          players[socket.id].y = newY;
          io.emit('playerMoved', players[socket.id]);
        } else {
          // Envoi de la position actuelle au client pour annuler visuellement le déplacement
          socket.emit('playerMoved', players[socket.id]);
        }
      }
    });
  });

  // À la déconnexion, supprimer le joueur et prévenir les autres clients
  socket.on('disconnect', () => {
    console.log(`🧳 Joueur déconnecté - id ${socket.id}`)
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// http.listen(3000, () => {   permet de faire un server uniquement local
http.listen(3000, '0.0.0.0', () => {
  console.log('Serveur démarré sur le port 3000');
});
