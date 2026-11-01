(function() {
    var SERVER = "http://192.168.178.52:8766";
    var TOKEN = "440e0c565ff776124eff1b3334129d55ad12906b1712351c";
    var songs = [], currentSongIndex = 0, isPlaying = false;
    var audio = document.getElementById("audio-player"), titleEl = document.getElementById("song-title"), artistEl = document.getElementById("song-artist"), statusEl = document.getElementById("status-text");
    var canvas = document.getElementById("visualizer"), ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var analyser = null, dataArray = null, isFakeVisualizer = false;
    try {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser(); analyser.fftSize = 256;
        source.connect(analyser); analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { isFakeVisualizer = true; }
    function loadSongs() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", SERVER + "/songs", true);
        xhr.setRequestHeader("X-Token", TOKEN);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    songs = response.songs;
                    if (songs && songs.length > 0) playSong(0);
                    else titleEl.innerHTML = "Keine Songs gefunden";
                } catch(e) { titleEl.innerHTML = "Fehler beim JSON-Parsing"; }
            } else if (xhr.readyState === 4) { titleEl.innerHTML = "Server-Fehler: " + xhr.status; }
        };
        xhr.send();
    }
    function playSong(index) {
        if (index < 0) index = songs.length - 1;
        if (index >= songs.length) index = 0;
        currentSongIndex = index;
        var song = songs[currentSongIndex];
        titleEl.innerHTML = song.title; artistEl.innerHTML = song.artist;
        audio.src = SERVER + "/stream?id=" + song.id + "&t=" + TOKEN;
        audio.play(); isPlaying = true; statusEl.innerHTML = "SPIELT";
    }
    function togglePlay() {
        if (!audio.src) return;
        if (isPlaying) { audio.pause(); statusEl.innerHTML = "PAUSIERT"; }
        else { audio.play(); statusEl.innerHTML = "SPIELT"; }
        isPlaying = !isPlaying;
    }
    function handleKey(e) {
        var keyCode = e.keyCode;
        if (keyCode === 13) togglePlay();
        else if (keyCode === 39) playSong(currentSongIndex + 1);
        else if (keyCode === 37) playSong(currentSongIndex - 1);
        else if (keyCode === 10009) { try { tizen.application.getCurrentApplication().exit(); } catch(ex) { window.close(); } }
    }
    document.addEventListener("keydown", handleKey);
    var frameCount = 0;
    function draw() {
        window.requestAnimationFrame(draw);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var barWidth = 15, barGap = 5, numBars = Math.floor(canvas.width / (barWidth + barGap)), maxBarHeight = canvas.height / 2;
        ctx.fillStyle = "#4fc3f7";
        for (var i = 0; i < numBars; i++) {
            var barHeight = 10;
            if (isFakeVisualizer || !analyser) {
                if (isPlaying) barHeight = Math.abs(Math.sin((frameCount + i) * 0.1)) * maxBarHeight * Math.random();
                else barHeight = Math.abs(Math.sin((frameCount + i) * 0.05)) * 20;
            } else {
                analyser.getByteFrequencyData(dataArray);
                var val = dataArray[i % dataArray.length];
                barHeight = (val / 255) * maxBarHeight;
            }
            if (barHeight < 5) barHeight = 5;
            ctx.fillRect(i * (barWidth + barGap), canvas.height - barHeight, barWidth, barHeight);
        }
        frameCount++;
    }
    if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
        try { tizen.tvinputdevice.registerKeyBatch(['MediaPlayPause', 'MediaPlay', 'MediaPause']); } catch (e) {}
    }
    window.onload = function() { loadSongs(); draw(); };
})();
