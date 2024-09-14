const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let counter = 0;
let targetNumber = Math.floor(Math.random() * 151) + 50;
const cooldowns = new Map();
let actionsInLastSecond = 0;

const getTimeStamp = () => new Date().toISOString();

setInterval(() => {
  broadcast(JSON.stringify({ type: 'changesPerSecond', cps: actionsInLastSecond }));
  actionsInLastSecond = 0;
}, 1000);

wss.on('connection', (ws) => {
  const clientId = ws._socket.remoteAddress + ':' + ws._socket.remotePort;
  console.log(`[${getTimeStamp()}] Client connected: ${clientId}`);

  ws.send(JSON.stringify({
    type: 'init',
    counter,
    targetNumber,
    onlineUsers: wss.clients.size,
  }));

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (error) {
      console.error(`[${getTimeStamp()}] Error parsing message from ${clientId}:`, error);
      return;
    }
    console.log(`[${getTimeStamp()}] Received message from ${clientId}:`, data);

    if (cooldowns.has(clientId)) {
      const lastActionTime = cooldowns.get(clientId);
      const now = Date.now();
      if (now - lastActionTime < 250) {
        console.log(`[${getTimeStamp()}] Action ignored due to cooldown for ${clientId}`);
        return;
      }
    }

    cooldowns.set(clientId, Date.now());

    if (data.type === 'increment') {
      counter++;
      actionsInLastSecond++;
      console.log(`[${getTimeStamp()}] Counter incremented by ${clientId}. New value: ${counter}`);
    } else if (data.type === 'decrement') {
      counter--;
      actionsInLastSecond++;
      console.log(`[${getTimeStamp()}] Counter decremented by ${clientId}. New value: ${counter}`);
    }

    if (counter === targetNumber) {
      console.log(`[${getTimeStamp()}] Target reached by ${clientId}! Counter reset.`);
      broadcast(JSON.stringify({ type: 'targetReached', counter }));
      counter = 0;
      targetNumber = Math.floor(Math.random() * 151) + 50;
      broadcast(JSON.stringify({ type: 'init', counter, targetNumber }));
    } else {
      broadcast(JSON.stringify({ type: 'update', counter }));
    }
  });

  ws.on('close', () => {
    console.log(`[${getTimeStamp()}] Client disconnected: ${clientId}`);
    cooldowns.delete(clientId);
    broadcast(JSON.stringify({ type: 'onlineUsers', count: wss.clients.size }));
  });
  broadcast(JSON.stringify({ type: 'onlineUsers', count: wss.clients.size }));
});

const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`[${getTimeStamp()}] Server running on port ${port}`);
});
