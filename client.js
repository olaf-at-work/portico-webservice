import fetch from 'node-fetch';
import WebSocket from 'ws';


// Your JSON data
const jsonData = {
    "settings": {
        "provider": "native"
    },
    "relaychain": {
        "chain": "rococo-local",
        "default_command": "./bin/polkadot",
        "nodes": [
            {
                "name": "alice",
            },
            {
                "name": "bob",
            }
        ]
    },
    "parachains": [
        {
            "id": 2100,
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
const apiUrl = 'http://localhost:4000/network';
const wsUrl = 'ws://localhost:4000/';

// Function to send the POST request
function sendPostRequest() {
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('POST request success:', JSON.stringify(data, null, 4));
            connectWebSocket();
        })
        .catch(error => console.error('Error in POST request:', error));
}

// Function to establish the WebSocket connection
function connectWebSocket() {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('WebSocket connection established');
    });

    ws.on('message', event => {
        const message = event.toString();
        console.log('Message from server:', message);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
}

// Make the POST request
sendPostRequest();
