import { LitElement, html, css } from 'lit';
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

  static styles = css`
    :host {
      display: block;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .container {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    h1 {
      text-align: center;
      color: #667eea;
      margin-top: 0;
      font-size: 2.5rem;
    }

    .controls {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin: 2rem 0;
    }

    button {
      padding: 1rem 2rem;
      font-size: 1.2rem;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: bold;
    }

    button.start {
      background: #667eea;
      color: white;
    }

    button.start:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    button.stop {
      background: #ef4444;
      color: white;
    }

    button.stop:hover {
      background: #dc2626;
      transform: translateY(-2px);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pitch-display {
      text-align: center;
      margin: 2rem 0;
      padding: 2rem;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 15px;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .note {
      font-size: 5rem;
      font-weight: bold;
      color: #667eea;
      margin: 0;
    }

    .note.in-tune {
      color: #10b981;
    }

    .frequency {
      font-size: 1.5rem;
      color: #64748b;
      margin: 0.5rem 0;
    }

    .clarity {
      font-size: 1rem;
      color: #94a3b8;
    }

    .status {
      text-align: center;
      font-size: 1.2rem;
      color: #64748b;
      margin: 1rem 0;
    }

    .music-sheet {
      margin-top: 2rem;
      padding: 2rem;
      background: #f8fafc;
      border-radius: 15px;
    }

    .music-sheet h2 {
      color: #475569;
      margin-top: 0;
    }

    .staff {
      position: relative;
      height: 150px;
      margin: 2rem 0;
    }

    .staff-line {
      position: absolute;
      width: 100%;
      height: 2px;
      background: #1e293b;
      left: 0;
    }

    .note-indicator {
      position: absolute;
      width: 40px;
      height: 40px;
      background: #667eea;
      border-radius: 50%;
      left: 50%;
      transform: translateX(-50%);
      transition: top 0.3s ease;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .note-indicator.in-tune {
      background: #10b981;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
    }

    .target-notes {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .target-note-btn {
      padding: 0.5rem 1rem;
      background: #e2e8f0;
      color: #475569;
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .target-note-btn:hover {
      background: #cbd5e1;
    }

    .target-note-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .info {
      margin-top: 2rem;
      padding: 1rem;
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }

    .info p {
      margin: 0.5rem 0;
      color: #1e40af;
    }
  `;

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
      <div class="container">
        <h1>🎻 Violin Companion</h1>
        
        <div class="controls">
          <button 
            class="start" 
            @click=${this.startListening} 
            ?disabled=${this.isListening}>
            Start Listening
          </button>
          <button 
            class="stop" 
            @click=${this.stopListening} 
            ?disabled=${!this.isListening}>
            Stop
          </button>
        </div>

        <div class="status">
          ${this.isListening ? '🎤 Listening...' : '🔇 Not listening'}
        </div>

        <div class="pitch-display">
          <div class="note ${this.inTune ? 'in-tune' : ''}">${this.currentNote}</div>
          ${this.currentFrequency > 0 ? html`
            <div class="frequency">${this.currentFrequency.toFixed(2)} Hz</div>
            <div class="clarity">Clarity: ${(this.clarity * 100).toFixed(0)}%</div>
          ` : html`
            <div class="frequency">Play a note on your violin</div>
          `}
        </div>

        <div class="music-sheet">
          <h2>Target Note: ${this.targetNote}</h2>
          
          <div class="target-notes">
            ${Object.keys(this.noteFrequencies).map(note => html`
              <button 
                class="target-note-btn ${this.targetNote === note ? 'active' : ''}"
                @click=${() => this.setTargetNote(note)}>
                ${note}
              </button>
            `)}
          </div>

          <div class="staff">
            ${[0, 1, 2, 3, 4].map(i => html`
              <div class="staff-line" style="top: ${20 + i * 26}px"></div>
            `)}
            ${this.currentNote !== '--' ? html`
              <div 
                class="note-indicator ${this.inTune ? 'in-tune' : ''}" 
                style="top: ${this.getNotePosition(this.currentNote)}px">
              </div>
            ` : ''}
          </div>
        </div>

        <div class="info">
          <p><strong>How to use:</strong></p>
          <p>1. Click "Start Listening" to allow microphone access</p>
          <p>2. Select a target note you want to practice</p>
          <p>3. Play that note on your violin</p>
          <p>4. The app will show you the detected pitch and if you're in tune (green = in tune)</p>
        </div>
      </div>
    `;
  }
}

customElements.define('violin-companion', ViolinCompanion);
