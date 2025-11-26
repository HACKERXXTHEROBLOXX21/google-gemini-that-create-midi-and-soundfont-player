// app.js

const STATUS_ELEMENT = document.getElementById('status');
const START_BUTTON = document.getElementById('startButton');

// This is a path to a small, general-purpose SoundFont (.sf2) file. 
// You must replace this with the URL to your own SoundFont file.
const SOUNDFONT_URL = "https://cdn.jsdelivr.net/gh/jet2jet/js-synthesizer@1.1.0/test/soundfonts/GeneralUser_gs_mini.sf2";

let synth = null;

async function initAndPlay() {
    START_BUTTON.disabled = true;
    STATUS_ELEMENT.textContent = 'Status: Initializing FluidSynth Wasm...';

    try {
        // 1. Wait for the underlying Wasm module to fully load
        await JSSynth.waitForReady();
        STATUS_ELEMENT.textContent = 'Status: FluidSynth engine ready. Creating synthesizer...';

        // 2. Create the Synthesizer instance
        synth = new JSSynth.Synthesizer();

        // 3. Load the SoundFont
        STATUS_ELEMENT.textContent = `Status: Loading SoundFont from: ${SOUNDFONT_URL}...`;
        const sfId = await synth.loadSoundFont(SOUNDFONT_URL, false);
        
        if (sfId === -1) {
            throw new Error("Failed to load SoundFont. Check the URL.");
        }
        
        STATUS_ELEMENT.textContent = `Status: SoundFont loaded (ID: ${sfId}). Playing C4...`;

        // 4. Select the instrument (General MIDI Piano on Channel 0)
        const channel = 0;
        const bank = 0;
        const preset = 0; // MIDI Piano
        synth.midiProgramSelect(channel, sfId, bank, preset);

        // 5. Play a note: MIDI note 60 (Middle C/C4) with velocity 100
        const note = 60;
        const velocity = 100; 

        synth.noteOn(channel, note, velocity);

        // 6. Stop the note after 1 second
        STATUS_ELEMENT.textContent = 'Status: Playing... Note will stop in 1 second.';
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        synth.noteOff(channel, note);
        STATUS_ELEMENT.textContent = 'Status: Playback finished. Ready to play again.';

    } catch (error) {
        STATUS_ELEMENT.textContent = `Status: Error during playback: ${error.message}`;
        console.error("FluidSynth initialization error:", error);
    } finally {
        START_BUTTON.disabled = false;
    }
}

// Start the process on user interaction
START_BUTTON.addEventListener('click', initAndPlay);
