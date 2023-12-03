import Fastify from 'fastify';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fastifyWebsocket from '@fastify/websocket';
import { Network, start, Providers } from '@zombienet/orchestrator';

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

    // needs some validation here
    const network = await start("ZOMBIENET_CREDENTIALS", networkTopology, {
        spawnConcurrency: 5,
    });

    // network should be stored globally
    console.log(network);
    console.log("\n\n");

    reply.send({ result: 'OK', network: sanitizeNetwork(network) });
});

// Broadcast the data to all connected clients
function broadcastToClients(data) {
    connections.forEach(socket => {
        if (socket.readyState === 1) {
            socket.send(data);
        }
    });
}

function sanitizeNetwork(network) {
    const relay = network.relay.map(sanitizeNode)

    const paras = Object.keys(network.paras).reduce((memo, paraId) => {
        const nodes = network.paras[paraId].nodes.map(sanitizeNode);
        memo[paraId] = nodes;
        return memo;
    }, {});

    return {
        ns: network.namespaces,
        relay,
        paras,
    }
}

function sanitizeNode({name, wsUri, prometheusUri, multiAddress}) {
    const parts = multiAddress.split("/");
    return {
        name,
        wsUri,
        prometheusUri,
        p2pId: parts[parts.length -1]
    }
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