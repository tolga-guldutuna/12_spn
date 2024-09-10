window.onload = () => {
    let localStream;
    let peerConnection;
    let isMuted = false; // Başlangıçta mikrofon açık
    let isCameraOff = false; // Başlangıçta kamera açık
    let roomId = '';
    let callStartTime;
    let timerInterval;

    const cameraStatusElement = document.getElementById('cameraStatus');
    const micStatusElement = document.getElementById('micStatus');
    const cameraText = document.getElementById('cameraText');
    const micText = document.getElementById('micText');
    const startButton = document.getElementById('startButton');
    const hangupButton = document.getElementById('hangupButton');
    const muteButton = document.getElementById('muteButton');
    const cameraButton = document.getElementById('cameraButton');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const roomLink = document.getElementById('roomLink');
    const generateLinkButton = document.getElementById('generateLinkButton');
    const copyButton = document.getElementById('copyButton');
    const callTimer = document.getElementById('callTimer');

    const socket = io();
    const servers = {
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
    };

    // Oda linki oluşturma butonu
    if (generateLinkButton) {
        generateLinkButton.addEventListener('click', () => {
            roomId = generateRoomId();  // Oda ID'si oluşturuluyor
            roomLink.value = `${window.location.origin}/customer.html?roomId=${roomId}`;  // Oda linki oluşturuluyor
            socket.emit('join-room', roomId);  // Oda katılımı sunucuya iletiliyor
        });
    }

    // Linki kopyalama işlemi
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            roomLink.select();
            document.execCommand('copy');  // Linki kopyalama işlemi
            alert("Link kopyalandı!");  // Kopyalama işlemi başarıyla tamamlandığında bildirim
        });
    }

    // Oda ID'sini oluşturma fonksiyonu
    function generateRoomId() {
        return Math.random().toString(36).substr(2, 9);  // Rastgele oda ID'si oluşturma
    }

    // Bağlantıyı başlatma butonuna tıklandığında
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("Bu siteye kamera erişimi sağlamak için HTTPS bağlantısını kullanmanız gerekmektedir.");
        location.href = 'https://' + location.hostname + location.pathname;
    } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        startButton.addEventListener('click', async () => {
            localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
            localVideo.srcObject = localStream;

            // PeerConnection başlat
            peerConnection = new RTCPeerConnection(servers);
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            peerConnection.ontrack = (event) => {
                remoteVideo.srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {candidate: event.candidate, roomId});
                }
            };

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', {offer, roomId});

            // Timer başlat
            startCallTimer();

            // Butonların durumunu güncelle
            hangupButton.disabled = false;
            muteButton.disabled = false;
            cameraButton.disabled = false;

            // Başlangıçta mikrofon ve kamera açık
            updateStatus('on', 'on');
        });
    } else {
        // Tarayıcı getUserMedia fonksiyonunu desteklemiyor
        alert("Tarayıcınız kamera erişimini desteklemiyor. Lütfen Google Chrome, Firefox veya Microsoft Edge gibi modern bir tarayıcı kullanın.");
    }

    // ICE candidate alma ve ekleme
    socket.on('ice-candidate', async ({candidate}) => {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    });

    // Teklif alma ve karşılık verme
    socket.on('offer', async ({offer, roomId: incomingRoomId}) => {
        if (!peerConnection) {
            peerConnection = new RTCPeerConnection(servers);

            peerConnection.ontrack = (event) => {
                remoteVideo.srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {candidate: event.candidate, roomId: incomingRoomId});
                }
            };
        }

        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', {answer, roomId: incomingRoomId});
    });

    // Yanıt alma
    socket.on('answer', async ({answer}) => {
        await peerConnection.setRemoteDescription(answer);
    });

    // Odaya giriş
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('roomId');
    if (roomIdParam) {
        roomId = roomIdParam;
        socket.emit('join-room', roomId); // Odaya katılım
    }

    // Bağlantıyı kes butonuna tıklandığında
    hangupButton.addEventListener('click', () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        remoteVideo.srcObject = null;
        localVideo.srcObject = null;
        socket.emit('leave-room', roomId);
        stopCallTimer();
    });

    // Mikrofon aç/kapat
    muteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        localStream.getAudioTracks()[0].enabled = !isMuted;
        muteButton.textContent = isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat';
        updateMicStatus(isMuted ? 'off' : 'on');
    });

    // Kamera aç/kapat
    cameraButton.addEventListener('click', () => {
        isCameraOff = !isCameraOff;
        localStream.getVideoTracks()[0].enabled = !isCameraOff;
        cameraButton.textContent = isCameraOff ? 'Kamerayı Aç' : 'Kamerayı Kapat';
        updateCameraStatus(isCameraOff ? 'off' : 'on');
        if (isCameraOff) {
            hideVideo();
        } else {
            showVideo();
        }
    });

    // Video gizleme ve gösterme fonksiyonları
    function hideVideo() {
        localVideo.style.display = 'none';
    }

    function showVideo() {
        localVideo.style.display = 'block';
    }

    // Kamera ve mikrofon durumlarını güncelleme fonksiyonu
    function updateStatus(cameraStatus, micStatus) {
        updateCameraStatus(cameraStatus);
        updateMicStatus(micStatus);
    }

    function updateCameraStatus(status) {
        cameraStatusElement.dataset.status = status;
        cameraText.textContent = status === 'on' ? 'Açık' : 'Kapalı';
    }

    function updateMicStatus(status) {
        micStatusElement.dataset.status = status;
        micText.textContent = status === 'on' ? 'Açık' : 'Kapalı';
    }

    // Timer başlatma fonksiyonu
    function startCallTimer() {
        callStartTime = new Date();
        timerInterval = setInterval(() => {
            const currentTime = new Date();
            const elapsedTime = Math.floor((currentTime - callStartTime) / 1000);
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            callTimer.textContent = `Süre: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    // Timer durdurma fonksiyonu
    function stopCallTimer() {
        clearInterval(timerInterval);
        callTimer.textContent = 'Süre: 00:00';
    }
};
