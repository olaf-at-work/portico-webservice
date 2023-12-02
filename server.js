import Fastify from 'fastify';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fastifyWebsocket from '@fastify/websocket';

const fastify = Fastify({ logger: true });
fastify.register(fastifyWebsocket);

let outputBuffer = '';
let connections = [];

fastify.register(async function (fastify) {
    fastify.get('/', { websocket: true }, (connection, req) => {
        console.log('WebSocket client connected');

        // Add the new connection to the list of active connections
        connections.push(connection.socket);

        // Send messages to the client
        connection.socket.on('message', message => {
            console.log('Received message from client:', message);
            connection.socket.send('hi from server');
        });

        // Remove the connection from the list when it's closed
        connection.socket.on('close', () => {
            console.log('WebSocket client disconnected');
            connections = connections.filter(conn => conn !== connection.socket);
        });
    });
});


fastify.post('/network', async (request, reply) => {
    const networkTopology = request.body;
    const formattedJson = JSON.stringify(networkTopology, null, 4);
    await fs.writeFile('./zombienet-config/rococo-local-config_generated.json', formattedJson);

    const command = './zombienet-macos';
    const args = ['-p', 'native', 'spawn', 'zombienet-config/rococo-local-config_generated.json'];
    const process = spawn(command, args);

    process.stdout.on('data', (data) => {
        outputBuffer += data.toString();
        broadcastToClients();
    });

    process.stderr.on('data', (data) => {
        outputBuffer += data.toString();
        broadcastToClients();
    });

    process.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        broadcastToClients();
    });

    reply.send({ result: 'OK' });
});

// Broadcast the buffered data to all connected clients
function broadcastToClients() {
    connections.forEach(socket => {
        if (socket.readyState === 1) {
            socket.send(outputBuffer);
            outputBuffer = ''; // Clear buffer after sending
        }
    });
}

fastify.listen({ port: 4000 }, err => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('Server listening on port 3000');
});
