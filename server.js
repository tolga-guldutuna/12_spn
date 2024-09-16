require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const express = require('express');
const socketIo = require('socket.io');
const open = require('open');
const apiUrl = process.env.API_URL;
const app = express();
let server= null;

if (process.env.NODE_ENV === 'production') {
    console.log("Production ortamında çalışıyor.");
    const https = require('https');

    const options = {
        key: fs.readFileSync('/usr/share/tolga/usr/share/tolga/2/server.key'),
        cert: fs.readFileSync('/usr/share/tolga/usr/share/tolga/2/server.crt')
    };

    server = https.createServer(options, app);
} else {
    console.log("Development ortamında çalışıyor.");
    const http = require('http');
    server = http.createServer(app);
}

console.log("API URL:", apiUrl);
const io = socketIo(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.emit('room-joined', roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', { offer, roomId });
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', { answer, roomId });
    });

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', { candidate, roomId });
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User left room: ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(8095, () => {
    console.log('Server is listening on port 8095');
    open('http://localhost:8095/representative.html'); // Temsilci sayfasını otomatik açar
});
