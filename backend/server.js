const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// --- NEW CODE: Cache the available tags on server startup ---
let availableTags = [];

function loadTags() {
    console.log("Loading all available ingredient tags from Python...");
    const pythonProcess = spawn('python', ['data_api.py', 'tags']);
    let tagData = '';

    pythonProcess.stdout.on('data', (data) => {
        tagData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error loading tags: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            try {
                availableTags = JSON.parse(tagData);
                console.log(`Successfully loaded ${availableTags.length} tags.`);
            } catch (e) {
                console.error("Failed to parse tags from Python script.");
            }
        }
    });
}

// --- NEW ENDPOINT ---
app.get('/api/tags', (req, res) => {
    res.json(availableTags);
});
app.get('/api/recipe/:id', (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "No recipe ID provided" });
    }

    const pythonProcess = spawn('python', ['data_api.py', 'recipe', id]);

    let dataString = '';
    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error (get_recipe): ${data}`);
    });

    pythonProcess.on('close', (code) => {
        try {
            const result = JSON.parse(dataString);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: "Failed to parse Python output for recipe", details: dataString });
        }
    });
});

app.post('/api/search', (req, res) => {
    // ... (This function remains unchanged)
    const { tags } = req.body;

    if (!tags || tags.length === 0) {
        return res.status(400).json({ error: "No tags provided" });
    }

    const pythonProcess = spawn('python', ['data_api.py', 'search', ...tags]);

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        try {
            const result = JSON.parse(dataString);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: "Failed to parse Python output", details: dataString });
        }
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
    loadTags(); // Load tags when the server starts
});