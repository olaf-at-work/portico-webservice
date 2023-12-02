import fetch from 'node-fetch';
import WebSocket from 'ws';

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

// URL of your API endpoint
const apiUrl = 'http://localhost:4000/';

// Send the POST request
fetch(apiUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(jsonData)
})
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);

        // Establish a WebSocket connection
        const ws = new WebSocket('ws://localhost:4000/ws');

        ws.onopen = function () {
            console.log('WebSocket connection established');
        };

        ws.onmessage = function (event) {
            console.log('Message from server:', event.data);
        };

        ws.onclose = function () {
            console.log('WebSocket connection closed');
        };

        ws.onerror = function (error) {
            console.error('WebSocket error:', error);
        };
    })
    .catch(error => console.error('Error:', error));
