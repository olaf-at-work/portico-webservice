import fetch from 'node-fetch';
import WebSocket from 'ws';

// Function to send the POST request
function sendPostRequest(jsonData, apiUrl) {
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('POST request success:', data);
            connectWebSocket(wsUrl); // Establish WebSocket connection after POST success
        })
        .catch(error => console.error('Error in POST request:', error));
}

// Function to establish the WebSocket connection
function connectWebSocket(wsUrl) {
    console.log('Attempting to establish WebSocket connection...');
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('WebSocket connection established');
    });

    ws.on('message', event => {
        console.log('Message from server:', event);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
}

// Your JSON data
const jsonData = {
    "relaychain": {
        "chain": "rococo-local",
        "default_command": "./bin/polkadot",
        "nodes": [
            {
                "name": "alice",
                "validator": true
            },
            {
                "name": "bob",
                "validator": true
            }
        ]
    },
    "parachains": [
        {
            "id": 2100,
            "addToGenesis": true,
            "cumulus_based": true,
            "chain": "local",
            "add_to_genesis": false,
            "onboard_as_parachain": false,
            "collators": [
                {
                    "name": "parachain-collator01",
                    "command": "./bin/parachain-template-node"
                },
                {
                    "name": "parachain-collator02",
                    "command": "./bin/parachain-template-node"
                },
                {
                    "name": "parachain-collator03",
                    "command": "./bin/parachain-template-node"
                }
            ]
        }
    ]
};

// URLs
const apiUrl = 'http://localhost:4000/';
const wsUrl = 'ws://localhost:4000/ws';

// Make the POST request
sendPostRequest(jsonData, apiUrl);
