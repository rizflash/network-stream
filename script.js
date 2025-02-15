document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const loadStreamBtn = document.getElementById('load-stream');
  const subtitleInput = document.getElementById('upload-subtitle');
  const videoUrlInput = document.getElementById('video-url');

  let player = null;
  let currentHls = null;
  let currentDash = null;
  let currentFlv = null;
  let peerConnection = null;

  // Fungsi untuk skip waktu
  function skipTime(seconds) {
    video.currentTime += seconds;
  }

  // Inisialisasi Plyr dengan kontrol kustom
  function initPlyr() {
    if (player) player.destroy();

    player = new Plyr(video, {
      captions: { active: true, update: true, language: 'auto' },
      controls: [
        'play',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'captions',
        'settings',
        'fullscreen'
      ],
      listeners: {
        rewind: () => skipTime(-10),
        fastForward: () => skipTime(10)
      }
    });
  }

  // Deteksi tipe stream berdasarkan ekstensi/protokol URL
  function detectStreamType(url) {
    const extension = url.split('.').pop().split(/[?#]/)[0].toLowerCase();
    const protocol = url.split(':')[0].toLowerCase();

    const typeMap = {
      'm3u8': 'hls',
      'mpd': 'dash',
      'mp4': 'mp4',
      'webm': 'webm',
      'flv': 'flv',
      'rtmp': 'rtmp',
      'webrtc': 'webrtc',
      'srt': 'srt',
      'rtsp': 'rtsp'
    };

    if (typeMap[protocol]) return typeMap[protocol];
    return typeMap[extension] || 'hls';
  }

  // Load stream utama
  loadStreamBtn.addEventListener('click', () => {
    const url = videoUrlInput.value;
    if (!url) return alert('Masukkan URL terlebih dahulu!');

    // Bersihkan koneksi atau player sebelumnya
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (currentHls) { currentHls.destroy(); currentHls = null; }
    if (currentDash) { currentDash.reset(); currentDash = null; }
    if (currentFlv) { currentFlv.destroy(); currentFlv = null; }

    const streamType = detectStreamType(url);
    console.log(`Detected stream type: ${streamType}`);

    switch (streamType) {
      case 'hls': loadHLS(url); break;
      case 'dash': loadDASH(url); break;
      case 'mp4':
      case 'webm': loadDirect(url); break;
      case 'flv': loadFLV(url); break;
      case 'rtmp': loadRTMP(url); break;
      case 'webrtc': loadWebRTC(url); break;
      case 'srt': loadSRT(url); break;
      case 'rtsp': loadRTSP(url); break;
      default: alert('Format tidak didukung!');
    }
  });

  // Fungsi untuk HLS / LL-HLS
  function loadHLS(url) {
    if (Hls.isSupported()) {
      currentHls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 0,
      });
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
        initPlyr();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      initPlyr();
    } else {
      alert("HLS tidak didukung oleh browser ini.");
    }
  }

  // Fungsi untuk MPEG-DASH
  function loadDASH(url) {
    currentDash = dashjs.MediaPlayer().create();
    currentDash.initialize(video, url, true);
    initPlyr();
  }

  // Fungsi untuk MP4 dan WebM
  function loadDirect(url) {
    video.src = url;
    initPlyr();
  }

  // Fungsi untuk FLV menggunakan flv.js
  function loadFLV(url) {
    if (flvjs.isSupported()) {
      currentFlv = flvjs.createPlayer({
        type: 'flv',
        url: url,
        isLive: true
      });
      currentFlv.attachMediaElement(video);
      currentFlv.load();
      video.play();
      initPlyr();
    } else {
      alert("FLV tidak didukung oleh browser ini.");
    }
  }

  // Fungsi untuk RTMP (butuh transmuxing ke HLS/FLV)
  function loadRTMP(url) {
    alert('RTMP tidak didukung secara langsung oleh browser modern. Gunakan server konversi seperti Nginx-RTMP untuk mengubahnya ke HLS atau FLV.');
  }

  // Fungsi untuk WebRTC
  async function loadWebRTC(url) {
    try {
      const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      peerConnection = new RTCPeerConnection(config);
      
      peerConnection.ontrack = (event) => {
        video.srcObject = event.streams[0];
      };
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('Implementasikan logika signaling server di sini');
      initPlyr();
    } catch (error) {
      console.error('WebRTC error:', error);
    }
  }

  // Fungsi untuk SRT
  function loadSRT(url) {
    alert('SRT tidak didukung langsung oleh browser. Gunakan server relay atau konversi ke HLS/DASH.');
  }

  // Fungsi untuk RTSP
  function loadRTSP(url) {
    alert('RTSP tidak didukung langsung oleh browser. Gunakan server konversi seperti Wowza atau Nginx-RTMP untuk mengubahnya ke HLS atau DASH.');
  }

  // Handle upload subtitle
  subtitleInput.addEventListener('change', (event) => {
    const files = event.target.files;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function (e) {
        let content = e.target.result;
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'srt') {
          content = 'WEBVTT\n\n' + content.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
        }

        const blob = new Blob([content], { type: 'text/vtt' });
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = file.name;
        track.srclang = 'id';
        track.src = URL.createObjectURL(blob);
        video.appendChild(track);
      };
      reader.readAsText(file);
    });
  });
});
      
