const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');

const server = https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/koppelow.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/koppelow.com/fullchain.pem'),
});

const wss = new WebSocket.Server({ server, path: '/draw' });

let host = null;

wss.on('connection', socket => {
  console.log('🔌 Client connected');

  // Assign role
  if (!host) {
    host = socket;
    socket.role = 'host';
  } else {
    socket.role = 'joiner';
  }

  socket.send(JSON.stringify({ type: 'role', role: socket.role }));

  // If a joiner connects, tell the host
  if (socket.role === 'joiner' && host?.readyState === WebSocket.OPEN) {
    host.send(JSON.stringify({ type: 'joiner-ready' }));
  }

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

  socket.on('close', () => {
    console.log(`❌ Client (${socket.role}) disconnected`);

    // If the host left, promote a new one
    if (socket === host) {
      host = null;
      const nextHost = [...wss.clients].find(c => c.readyState === WebSocket.OPEN);
      if (nextHost) {
        host = nextHost;
        host.role = 'host';
        host.send(JSON.stringify({ type: 'role', role: 'host' }));
        console.log('⭐ Promoted a joiner to host');
      }
    }
  });
});

server.listen(3005, () => {
  console.log('🚀 WebSocket signaling server running at wss://koppelow.com:3005/draw');
});
