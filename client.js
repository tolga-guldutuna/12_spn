window.onload = () => {
    let localStream;
    let peerConnection;
    let callStartTime;
    let timerInterval;
    let roomId = '';
    let isMuted = false, isCameraOff = false, customerIsMuted = false, customerIsCameraOff = false;

    const cameraStatusElement = document.getElementById('cameraStatus');
    const customeCameraStatusElement = document.getElementById('customerCameraStatus');
    const micStatusElement = document.getElementById('micStatus');
    const customerMicStatusElement = document.getElementById('customerMicStatus');
    const cameraText = document.getElementById('cameraText');
    const customerCameraText = document.getElementById('customerCameraText');
    const micText = document.getElementById('micText');
    const customerMicText = document.getElementById('customerMicText');
    const startButton = document.getElementById('startButton');
    const hangupButton = document.getElementById('hangupButton');
    const customerHangupButton = document.getElementById('customerHangupButton');
    const muteButton = document.getElementById('muteButton');
    const customerMuteButton = document.getElementById('customerMuteButton');
    const cameraButton = document.getElementById('cameraButton');
    const customerCameraButton = document.getElementById('customerCameraButton');
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const roomLink = document.getElementById('roomLink');
    const generateLinkButton = document.getElementById('generateLinkButton');
    const copyButton = document.getElementById('copyButton');
    const callTimer = document.getElementById('callTimer');
    const repStatus = document.getElementById('repStatus');
    const saveButton = document.getElementById('saveButton');
    const appointmentCustomerSection = document.getElementById('appointmentCustomerSection');
    const randevuAyarlamaButton = document.getElementById('randevuAyarlamaButton');
    const logout = document.getElementById('logout');

    const socket = io();
    const servers = {
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
    };

    if (location.protocol !== 'https:' && location.hostname === 'localhost' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("Dev ortamında çalışıyor.");
        startButton.addEventListener('click', async () => {
            localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
            localVideo.srcObject = localStream;

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

            if (hangupButton) {
                hangupButton.disabled = false;
                muteButton.disabled = false;
                cameraButton.disabled = false;
                startCallTimer();
                updateStatus('on', 'on');
            }

            if (customerHangupButton) {
                customerHangupButton.disabled = false;
                customerCameraButton.disabled = false;
                customerMuteButton.disabled = false;
                updateCustomerStatus('on', 'on');
            }
        });
    } else if (location.protocol === 'https:') {
        console.log("Production ortamında çalışıyor.");

        startButton.addEventListener('click', async () => {
            localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
            localVideo.srcObject = localStream;

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

            if (hangupButton) {
                hangupButton.disabled = false;
                muteButton.disabled = false;
                cameraButton.disabled = false;
                startCallTimer();
                updateStatus('on', 'on');
            }

            if (customerHangupButton) {
                customerHangupButton.disabled = false;
                customerCameraButton.disabled = false;
                customerMuteButton.disabled = false;
                updateCustomerStatus('on', 'on');
            }
        });
    } else {
        // Tarayıcı getUserMedia fonksiyonunu desteklemiyor
        alert("Tarayıcınız kamera erişimini desteklemiyor. Lütfen Google Chrome, Firefox veya Microsoft Edge gibi modern bir tarayıcı kullanın.");
    }

    socket.on('ice-candidate', async ({candidate}) => {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    });

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

    socket.on('answer', async ({answer}) => {
        await peerConnection.setRemoteDescription(answer);
    });

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

            // Bilgilendirme mesajını göster
            const infoMessage = document.getElementById('infoMessage');
            infoMessage.style.display = 'block';

            // 3 saniye sonra mesajı gizle
            setTimeout(() => {
                infoMessage.style.display = 'none';
            }, 3000);
        });
    }

    if (logout) {
        logout.addEventListener('click', () => {
            if (location.protocol === 'https:') {
                console.log("Production ortamında çalışıyor.");
                window.location.href = "http://10.12.103.18:8097/agent/login";
            } else {
                console.log("Development ortamında çalışıyor.");
                window.location.href = "http://localhost:8097/agent/login";
            }
        });
    }

    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('roomId');
    if (roomIdParam) {
        roomId = roomIdParam;
        socket.emit('join-room', roomId); // Odaya katılım
    }

    if (hangupButton) {
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
            updateStatus('off', 'off');
        });
    }

    if (muteButton) {
        muteButton.addEventListener('click', () => {
            isMuted = !isMuted;
            localStream.getAudioTracks()[0].enabled = !isMuted;
            muteButton.textContent = isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat';
            updateMicStatus(isMuted ? 'off' : 'on');
        });
    }

    if (cameraButton) {
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
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const infoMessageAppointment = document.getElementById('infoMessageAppointment');

            // Bilgilendirme mesajını göster
            infoMessageAppointment.style.display = 'block';

            // 3 saniye sonra mesajı gizle
            setTimeout(() => {
                infoMessageAppointment.style.display = 'none';
            }, 3000);

            // Randevu ve müşteri bilgileri bölümlerini gizle
            appointmentCustomerSection.style.display = 'none';

            // "Randevu Ayarla" butonunu göster
            randevuAyarlamaButton.style.display = 'block';
        });
    }

    if (randevuAyarlamaButton) {
        randevuAyarlamaButton.addEventListener('click', () => {
            // Show the appointment and customer information sections
            appointmentCustomerSection.style.display = 'block';

            // Hide the "Randevu Ayarla" button
            randevuAyarlamaButton.style.display = 'none';
        });
    }

//Customer buttons

    if (customerMuteButton) {
        customerMuteButton.addEventListener('click', () => {
            customerIsMuted = !customerIsMuted;
            localStream.getAudioTracks()[0].enabled = !customerIsMuted;
            customerMuteButton.textContent = customerIsMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat';
            updateCustomerMicStatus(customerIsMuted ? 'off' : 'on');
        });
    }

    if (customerHangupButton) {
        customerHangupButton.addEventListener('click', () => {
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
            updateCustomerStatus('off', 'off');
        });
    }

    if (customerCameraButton) {
        customerCameraButton.addEventListener('click', () => {
            customerIsCameraOff = !customerIsCameraOff;
            localStream.getVideoTracks()[0].enabled = !isCameraOff;
            customerCameraButton.textContent = customerIsCameraOff ? 'Kamerayı Aç' : 'Kamerayı Kapat';
            updateCustomerCameraStatus(customerIsCameraOff ? 'off' : 'on');
            if (customerIsCameraOff) {
                hideVideo();
            } else {
                showVideo();
            }
        });
    }

    function hideVideo() {
        localVideo.style.display = 'none';
    }

    function showVideo() {
        localVideo.style.display = 'block';
    }

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
        customerMicText.textContent = status === 'on' ? 'Açık' : 'Kapalı';
    }

    function startCallTimer() {
        callStartTime = new Date();
        repStatus.textContent = ': Çevrimiçi ';
        timerInterval = setInterval(() => {
            const currentTime = new Date();
            const elapsedTime = Math.floor((currentTime - callStartTime) / 1000);
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            callTimer.textContent = `Süre: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function stopCallTimer() {
        clearInterval(timerInterval);
        callTimer.textContent = 'Süre: 00:00';
        repStatus.textContent = ': Çevrimdışı ';
    }

    function generateRoomId() {
        return Math.random().toString(36).substr(2, 9);  // Rastgele oda ID'si oluşturma
    }

//Customer functions

    function updateCustomerStatus(customerCameraStatus, customerMicStatus) {
        updateCustomerCameraStatus(customerCameraStatus);
        updateCustomerMicStatus(customerMicStatus);
    }

    function updateCustomerCameraStatus(status) {
        customeCameraStatusElement.dataset.status = status;
        customerCameraText.textContent = status === 'on' ? 'Açık' : 'Kapalı';
    }

    function updateCustomerMicStatus(status) {
        customerMicStatusElement.dataset.status = status;
        customerMicText.textContent = status === 'on' ? 'Açık' : 'Kapalı';
    }
}
;
