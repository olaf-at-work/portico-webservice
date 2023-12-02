import Fastify from 'fastify';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fastifyWebsocket from '@fastify/websocket';

const fastify = Fastify({ logger: true });
fastify.register(fastifyWebsocket);

let outputBuffer = '';
let connection = '';
let connections = [];


function parseZombienetOutput(output) {
    const startIndex = output.indexOf("Network launched 🚀🚀");
    const relevantOutput = output.substring(startIndex);
    const lines = relevantOutput.split('\n');
    const parsedData = [];
    let currentEntry = {};

    lines.forEach(line => {
        if (line.includes('│ Name')) {
            if (currentEntry.name) {
                parsedData.push(currentEntry); // Save the previous entry
                currentEntry = {}; // Reset for new entry
            }
            currentEntry.name = line.split('│')[2].trim();
        } else if (line.includes('│ Direct Link')) {
            currentEntry.directLink = line.split('│')[2].trim();
        } else if (line.includes('│ Prometheus Link')) {
            currentEntry.prometheusLink = line.split('│')[2].trim();
        } else if (line.includes('│ Log Cmd')) {
            currentEntry.logCmd = line.split('│')[3].trim();
        }
    });

    if (currentEntry.name) {
        parsedData.push(currentEntry); // Save the last entry
    }

    return parsedData;
}

fastify.register(async function (fastify) {
    fastify.get('/', { websocket: true }, (connection, req) => {
        console.log('WebSocket client connected');
        connections.push(connection.socket);

        connection.socket.on('message', message => {
            console.log('Received message from client:', message);
            connection.socket.send('hi from server');
        });

        connection.socket.on('close', () => {
            console.log('WebSocket client disconnected');
            connections = connections.filter(conn => conn !== connection.socket);
        });
    });
});


fastify.post('/network', async (request, reply) => {
    const date = formatDate();
    const networkTopology = request.body;
    const formattedJson = JSON.stringify(networkTopology, null, 4);
    await fs.writeFile('./zombienet-config/rococo-local-config_generated.json', formattedJson);

    const command = './zombienet-macos';
    const args = ['-p', 'native', 'spawn', '-d', `/tmp/${date}`, 'zombienet-config/rococo-local-config_generated.json'];
    const process = spawn(command, args);

    let commandOutput = '';

    process.stdout.on('data', (data) => {
        console.log('Command output:', data.toString())
        const parsedOutput = parseZombienetOutput(data.toString());
        console.log('Parsed output:', parsedOutput);
        const parsedOutputString = JSON.stringify(parsedOutput);
        if (parsedOutputString.length > 0) {
            broadcastToClients(parsedOutputString);
        }
        broadcastToClients(parsedOutputString);
    });

    process.stderr.on('data', (data) => {
        commandOutput += data.toString();
    });

    process.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
    });

    reply.send({ result: 'OK' });
});

// Broadcast the data to all connected clients
function broadcastToClients(data) {
    connections.forEach(socket => {
        if (socket.readyState === 1) {
            socket.send(data);
        }
    });
}

function formatDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}




fastify.listen({ port: 4000 }, err => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('Server listening on port 4000');
});