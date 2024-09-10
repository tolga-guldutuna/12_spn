const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Public klasörünü statik dosyalar için ayarlayın
app.use(express.static(path.join(__dirname, '../public')));

// React Router'ın yönlendirmelerini ele almak için
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'), (err) => {
        if (err) {
            res.status(500).send(err);
        }
    });
});

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} oda ${roomId}'a katıldı.`);
    });

    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', { offer, roomId });
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', { answer });
    });

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', { candidate });
    });

    socket.on('disconnect', () => {
        console.log('Bağlantı koptu:', socket.id);
    });
});

const PORT = process.env.PORT || 8095;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
