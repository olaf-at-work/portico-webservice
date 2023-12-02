import Fastify from 'fastify';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fastifyWebsocket from '@fastify/websocket';

const fastify = Fastify({ logger: true });
fastify.register(fastifyWebsocket);

let outputBuffer = '';

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

fastify.post('/', async (request, reply) => {
    const networkTopology = request.body;

    const formattedJson = JSON.stringify(networkTopology, null, 4);
    await fs.writeFile('./zombienet-config/rococo-local-config_generated.json', formattedJson);

    const command = './zombienet-macos';
    const args = ['-p', 'native', 'spawn', 'zombienet-config/rococo-local-config_generated.json'];
    const process = spawn(command, args);

    process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        outputBuffer += data.toString();
    });

    process.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
        outputBuffer += data.toString();
    });

    process.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
    });

    reply.send({ result: 'OK' });
});

fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', message => {
        console.log('Received message from client:', message);
    });

    const interval = setInterval(() => {
        console.log('Sending data via WebSocket');
        if (connection.socket.readyState === 1) {
            connection.socket.send(outputBuffer);
            connection.socket.send("data from web socket");
            //  outputBuffer = '';
        }
    }, 1000);

    connection.socket.on('close', () => {
        console.log('WebSocket connection closed');
        clearInterval(interval);
    });
});

fastify.listen({ port: 4000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening on ${address}`);
});
