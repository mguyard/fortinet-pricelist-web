import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import https from 'https';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.HTTPS_PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuration HTTPS
const httpsOptions = {
    key: fs.readFileSync('/etc/certs/key.pem'),
    cert: fs.readFileSync('/etc/certs/cert.pem')
};

// Créer le serveur HTTPS
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
    console.log("Webserver is running...")
    console.log(`Try to connect to https://localhost:${PORT} or on another port if you have changed it during your container creation`);
});