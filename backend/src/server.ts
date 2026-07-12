import http from 'http';
import app from './app';
import * as socket from './utils/socket';
import { startOverdueCron } from './utils/cron';

const PORT = process.env.PORT || 5000;

// Create standard Node HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Socket.io integration
socket.init(server);

// Start background cron jobs schedulers
startOverdueCron();

// Listen on configured ports
server.listen(PORT, () => {
  console.log(`[Server] AssetFlow backend service running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
