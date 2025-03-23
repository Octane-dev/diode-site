const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', ws => {
    console.log('New client connected');
    
    ws.on('message', message => {
        console.log(`Received message: ${message}`);
        // Echo the message back to the client
        ws.send(`Server received: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is listening on ws://localhost:3000/ws');
