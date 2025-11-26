// app.js

const STATUS_ELEMENT = document.getElementById('status');
const START_BUTTON = document.getElementById('startButton');
const SF_UPLOAD = document.getElementById('sfUpload');
const MIDI_UPLOAD = document.getElementById('midiUpload');
const CANVAS = document.getElementById('visualizer');
const CTX = CANVAS.getContext('2d');

let synth = null;
let audioContext = null;
let analyser = null;

let soundFontBuffer = null;
let midiFileBuffer = null;

// --- Utility Functions ---

/** Reads a File object and returns an ArrayBuffer. */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

/** Function to draw the waveform on the canvas. */
function drawVisualizer() {
    if (!analyser || !audioContext.state === 'running') {
        return;
    }

    requestAnimationFrame(drawVisualizer);

    // Get the waveform data (time-domain data)
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    CTX.fillStyle = 'rgb(240, 240, 240)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    CTX.lineWidth = 2;
    CTX.strokeStyle = 'rgb(0, 150, 255)';

    CTX.beginPath();

    const sliceWidth = CANVAS.width * 1.0 / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
        // Data is 0-255, 128 is the midpoint (silence)
        const v = dataArray[i] / 128.0;
        const y = v * CANVAS.height / 2;

        if(i === 0) {
            CTX.moveTo(x, y);
        } else {
            CTX.lineTo(x, y);
        }

        x += sliceWidth;
    }

    CTX.lineTo(CANVAS.width, CANVAS.height/2); // Connect back to the center line
    CTX.stroke();
}

// --- Event Handlers ---

/** Checks if both files are loaded and enables the play button. */
function checkFilesAndEnableButton() {
    if (soundFontBuffer && midiFileBuffer) {
        START_BUTTON.disabled = false;
        STATUS_ELEMENT.textContent = 'Status: SoundFont and MIDI file ready. Click "Load and Play MIDI".';
    } else {
        START_BUTTON.disabled = true;
        STATUS_ELEMENT.textContent = 'Status: Upload a SoundFont and MIDI file to begin.';
    }
}

SF_UPLOAD.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        STATUS_ELEMENT.textContent = `Status: Reading SoundFont: ${file.name}...`;
        soundFontBuffer = await readFileAsArrayBuffer(file);
        checkFilesAndEnableButton();
    }
});

MIDI_UPLOAD.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        STATUS_ELEMENT.textContent = `Status: Reading MIDI file: ${file.name}...`;
        midiFileBuffer = await readFileAsArrayBuffer(file);
        checkFilesAndEnableButton();
    }
});


// --- Initialization and Playback ---

async function initAndPlay() {
    if (!soundFontBuffer || !midiFileBuffer) return;

    START_BUTTON.disabled = true;
    STATUS_ELEMENT.textContent = 'Status: Initializing FluidSynth Wasm...';

    try {
        // 1. Wait for the Wasm module to be ready
        await JSSynth.waitForReady();
        STATUS_ELEMENT.textContent = 'Status: FluidSynth engine ready. Creating synthesizer...';

        // 2. Create AudioContext and AnalyzerNode for visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.connect(audioContext.destination);

        // 3. Create the Synthesizer instance and connect its output to the analyser
        synth = new JSSynth.Synthesizer(audioContext); // Pass context to synth
        synth.getAudioNode().connect(analyser);

        // 4. Load the SoundFont
        STATUS_ELEMENT.textContent = 'Status: Loading uploaded SoundFont...';
        const sfId = await synth.loadSoundFont(soundFontBuffer);
        
        if (sfId === -1) {
            throw new Error("Failed to load SoundFont. Is the file corrupted or not SF2/SF3?");
        }
        
        STATUS_ELEMENT.textContent = `Status: SoundFont loaded (ID: ${sfId}). Starting playback...`;

        // 5. Parse and play the MIDI file
        const midiFile = new JSSynth.MidiFile(midiFileBuffer);
        const player = new JSSynth.Player(synth, midiFile);

        player.on('start', () => {
            STATUS_ELEMENT.textContent = 'Status: Playing MIDI... (Visualization active)';
            drawVisualizer(); // Start visualization when playback starts
        });

        player.on('end', () => {
            STATUS_ELEMENT.textContent = 'Status: Playback finished. Ready.';
            START_BUTTON.disabled = false;
        });

        player.on('error', (e) => {
            STATUS_ELEMENT.textContent = `Status: Player error: ${e.message}`;
            console.error("Player error:", e);
            START_BUTTON.disabled = false;
        });
        
        player.play();

    } catch (error) {
        STATUS_ELEMENT.textContent = `Status: Error during initialization/playback: ${error.message}`;
        console.error("Synth error:", error);
        START_BUTTON.disabled = false;
    }
}

// Attach the event listener to start the process
START_BUTTON.addEventListener('click', initAndPlay);

// Initial status check
checkFilesAndEnableButton();
