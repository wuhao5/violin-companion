import { LitElement, html } from 'lit';
import { PitchDetector } from 'pitchy';

export class ViolinCompanion extends LitElement {
  static properties = {
    isListening: { type: Boolean },
    currentNote: { type: String },
    currentFrequency: { type: Number },
    clarity: { type: Number },
    targetNote: { type: String },
    inTune: { type: Boolean }
  };

  // Disable shadow DOM to allow Tailwind classes to work
  // Note: This removes style encapsulation and may cause CSS conflicts with parent elements
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.isListening = false;
    this.currentNote = '--';
    this.currentFrequency = 0;
    this.clarity = 0;
    this.targetNote = 'A4';
    this.inTune = false;
    this.audioContext = null;
    this.analyser = null;
    this.detector = null;
    this.animationId = null;
  }

  // Note frequencies for violin strings and common notes
  noteFrequencies = {
    'G3': 196.00,
    'A3': 220.00,
    'B3': 246.94,
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F4': 349.23,
    'G4': 392.00,
    'A4': 440.00,
    'B4': 493.88,
    'C5': 523.25,
    'D5': 587.33,
    'E5': 659.25,
    'F5': 698.46,
    'G5': 783.99,
    'A5': 880.00
  };

  async startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.fftSize;
      const buffer = new Float32Array(bufferLength);
      
      this.detector = PitchDetector.forFloat32Array(bufferLength);
      this.detector.minVolumeDecibels = -30;
      
      this.isListening = true;
      
      const updatePitch = () => {
        this.analyser.getFloatTimeDomainData(buffer);
        
        const [frequency, clarity] = this.detector.findPitch(buffer, this.audioContext.sampleRate);
        
        if (frequency && clarity > 0.9) {
          this.currentFrequency = frequency;
          this.clarity = clarity;
          this.currentNote = this.frequencyToNote(frequency);
          this.checkTuning(frequency);
        }
        
        if (this.isListening) {
          this.animationId = requestAnimationFrame(updatePitch);
        }
      };
      
      updatePitch();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please grant microphone permissions.');
    }
  }

  stopListening() {
    this.isListening = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.currentNote = '--';
    this.currentFrequency = 0;
    this.clarity = 0;
    this.inTune = false;
  }

  frequencyToNote(frequency) {
    const A4 = 440;
    const semitone = 69 + 12 * Math.log2(frequency / A4);
    const noteIndex = ((Math.round(semitone) % 12) + 12) % 12;
    const octave = Math.floor(Math.round(semitone) / 12) - 1;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes[noteIndex] + octave;
  }

  checkTuning(frequency) {
    const targetFreq = this.noteFrequencies[this.targetNote];
    if (targetFreq) {
      const cents = 1200 * Math.log2(frequency / targetFreq);
      this.inTune = Math.abs(cents) < 10; // Within 10 cents is considered in tune
    }
  }

  setTargetNote(note) {
    this.targetNote = note;
    if (this.currentFrequency > 0) {
      this.checkTuning(this.currentFrequency);
    }
  }

  getNotePosition(note) {
    // Map notes to staff positions (0-100, where 0 is top)
    const positions = {
      'A5': 5, 'G5': 10, 'F5': 17, 'E5': 25, 'D5': 33, 'C5': 40,
      'B4': 48, 'A4': 56, 'G4': 64, 'F4': 72, 'E4': 80,
      'D4': 88, 'C4': 95, 'B3': 100, 'A3': 105, 'G3': 110
    };
    return positions[note] || 50;
  }

  render() {
    return html`
      <div class="max-w-6xl mx-auto p-8">
        <div class="card bg-base-100 shadow-2xl">
          <div class="card-body">
            <h1 class="card-title text-4xl justify-center text-primary mb-6">
              <span class="icon-[mdi--violin] text-5xl"></span>
              Violin Companion
            </h1>
            
            <div class="flex justify-center gap-4 my-6">
              <button 
                class="btn btn-primary btn-lg"
                @click=${this.startListening} 
                ?disabled=${this.isListening}>
                <span class="icon-[mdi--microphone] text-xl"></span>
                Start Listening
              </button>
              <button 
                class="btn btn-error btn-lg"
                @click=${this.stopListening} 
                ?disabled=${!this.isListening}>
                <span class="icon-[mdi--stop] text-xl"></span>
                Stop
              </button>
            </div>

            <div class="text-center text-lg text-base-content/70 mb-4">
              ${this.isListening ? html`
                <span class="icon-[mdi--microphone] text-2xl text-success"></span>
                <span>Listening...</span>
              ` : html`
                <span class="icon-[mdi--microphone-off] text-2xl text-error"></span>
                <span>Not listening</span>
              `}
            </div>

            <div class="bg-gradient-to-br from-base-200 to-base-300 rounded-2xl p-8 min-h-[200px] flex flex-col justify-center items-center">
              <div class="text-7xl font-bold ${this.inTune ? 'text-success' : 'text-primary'} mb-2">
                ${this.currentNote}
              </div>
              ${this.currentFrequency > 0 ? html`
                <div class="text-2xl text-base-content/70 mb-1">
                  ${this.currentFrequency.toFixed(2)} Hz
                </div>
                <div class="text-lg text-base-content/60">
                  Clarity: ${(this.clarity * 100).toFixed(0)}%
                </div>
              ` : html`
                <div class="text-xl text-base-content/60">
                  Play a note on your violin
                </div>
              `}
            </div>

            <div class="mt-8 bg-base-200 rounded-2xl p-6">
              <h2 class="text-2xl font-bold text-base-content/80 mb-4">
                Target Note: ${this.targetNote}
              </h2>
              
              <div class="flex flex-wrap justify-center gap-2 mb-8">
                ${Object.keys(this.noteFrequencies).map(note => html`
                  <button 
                    class="btn btn-sm ${this.targetNote === note ? 'btn-primary' : 'btn-ghost'}"
                    @click=${() => this.setTargetNote(note)}>
                    ${note}
                  </button>
                `)}
              </div>

              <div class="relative h-40 my-8">
                ${[0, 1, 2, 3, 4].map(i => html`
                  <div class="absolute w-full h-0.5 bg-slate-700 left-0" style="top: ${20 + i * 26}px"></div>
                `)}
                ${this.currentNote !== '--' ? html`
                  <div 
                    class="absolute w-10 h-10 ${this.inTune ? 'bg-success shadow-success/50' : 'bg-primary'} rounded-full left-1/2 -translate-x-1/2 transition-all duration-300 shadow-lg"
                    style="top: ${this.getNotePosition(this.currentNote)}px">
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="alert alert-info mt-6">
              <span class="icon-[mdi--information-outline] text-2xl"></span>
              <div>
                <h3 class="font-bold">How to use:</h3>
                <ol class="list-decimal list-inside mt-2">
                  <li>Click "Start Listening" to allow microphone access</li>
                  <li>Select a target note you want to practice</li>
                  <li>Play that note on your violin</li>
                  <li>The app will show you the detected pitch and if you're in tune (green = in tune)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('violin-companion', ViolinCompanion);
