// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
  console.log('Nouveau joueur connecté:', socket.id);
  // Créer un joueur avec une position initiale
  players[socket.id] = { id: socket.id, x: 375, y: 275 };

  // Envoyer la liste de tous les joueurs au nouveau joueur
  socket.emit('currentPlayers', players);
  // Informer les autres joueurs de l'arrivée d'un nouveau joueur
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Lorsque le joueur se déplace, mettre à jour sa position et la diffuser
  socket.on('playerMovement', (movementData) => {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    io.emit('playerMoved', players[socket.id]);
  });

  // À la déconnexion, supprimer le joueur et prévenir les autres clients
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

http.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});
