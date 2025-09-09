const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');

const server = https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/koppelow.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/koppelow.com/fullchain.pem'),
});

const wss = new WebSocket.Server({ server, path: '/draw' });

let lastOffer = null;
let lastCandidates = [];

wss.on('connection', socket => {
  console.log('🔌 Client connected');

  // Assign role
  const role = wss.clients.size === 1 ? 'host' : 'joiner';
  socket.send(JSON.stringify({ type: 'role', role }));

  // Replay cached offer/candidates
  if (lastOffer) socket.send(JSON.stringify(lastOffer));
  lastCandidates.forEach(c => socket.send(JSON.stringify(c)));

  socket.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error('❌ Failed to parse message:', message);
      return;
    }

    console.log('📨 Message:', data);

    // Cache offer and candidates
    if (data.type === 'offer') {
      lastOffer = data;
      lastCandidates = [];
    } else if (data.type === 'candidate') {
      lastCandidates.push(data);
    }

    // Broadcast to all others
    wss.clients.forEach(client => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  socket.on('close', () => console.log('❌ Client disconnected'));
});

server.listen(3005, () => {
  console.log('🚀 WebSocket signaling server running at wss://koppelow.com:3005/holostream');
});