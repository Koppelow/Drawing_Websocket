const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');

const server = https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/koppelow.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/koppelow.com/fullchain.pem'),
});

const wss = new WebSocket.Server({ server, path: '/draw' });

wss.on('connection', socket => {
  console.log('🔌 Client connected');

  // Assign role
  const role = wss.clients.size === 1 ? 'host' : 'joiner';
  socket.send(JSON.stringify({ type: 'role', role }));


  socket.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error('❌ Failed to parse message:', message);
      return;
    }

    console.log('📨 Message:', data);


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
  console.log('🚀 WebSocket signaling server running at wss://koppelow.com:3005/draw');
});