import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { MusicSheet, Note, parseABCNotation, sampleSheets } from './music-sheet';

export class MusicSheetDisplay extends LitElement {
  @state()
  private sheet: MusicSheet | null = null;

  @state()
  private currentNoteIndex = 0;

  @state()
  private bookmark: number = 0;

  @state()
  private selectedSheet: string = 'twinkle-twinkle';

  // Disable shadow DOM for Tailwind
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadBookmark();
    this.loadSheet(this.selectedSheet);
  }

  private loadSheet(sheetName: string) {
    const abcNotation = sampleSheets[sheetName];
    if (abcNotation) {
      this.sheet = parseABCNotation(abcNotation);
      this.selectedSheet = sheetName;
      // If bookmark is beyond the new sheet, reset
      if (this.bookmark >= (this.sheet?.allNotes.length || 0)) {
        this.bookmark = 0;
        this.saveBookmark();
      }
      this.currentNoteIndex = this.bookmark;
    }
  }

  private loadBookmark() {
    const saved = localStorage.getItem('violin-companion-bookmark');
    if (saved) {
      this.bookmark = parseInt(saved, 10) || 0;
    }
  }

  private saveBookmark() {
    localStorage.setItem('violin-companion-bookmark', this.bookmark.toString());
  }

  setBookmark() {
    this.bookmark = this.currentNoteIndex;
    this.saveBookmark();
    // Show visual feedback
    this.dispatchEvent(new CustomEvent('bookmark-set', {
      detail: { index: this.bookmark },
      bubbles: true,
      composed: true
    }));
  }

  goToBookmark() {
    this.currentNoteIndex = this.bookmark;
  }

  reset() {
    this.currentNoteIndex = 0;
  }

  previousNote() {
    if (this.currentNoteIndex > 0) {
      this.currentNoteIndex--;
    }
  }

  nextNote() {
    if (this.sheet && this.currentNoteIndex < this.sheet.allNotes.length - 1) {
      this.currentNoteIndex++;
    }
  }

  previousMeasure() {
    if (!this.sheet) return;
    const currentMeasure = this.sheet.allNotes[this.currentNoteIndex]?.measure;
    if (currentMeasure === undefined) return;
    
    // Find first note of previous measure
    for (let i = this.currentNoteIndex - 1; i >= 0; i--) {
      if (this.sheet.allNotes[i].measure < currentMeasure) {
        // Found a note in previous measure, go to first note of that measure
        const targetMeasure = this.sheet.allNotes[i].measure;
        for (let j = i; j >= 0; j--) {
          if (this.sheet.allNotes[j].measure === targetMeasure) {
            this.currentNoteIndex = j;
          } else {
            break;
          }
        }
        return;
      }
    }
    // If we're in the first measure, go to beginning
    this.currentNoteIndex = 0;
  }

  nextMeasure() {
    if (!this.sheet) return;
    const currentMeasure = this.sheet.allNotes[this.currentNoteIndex]?.measure;
    if (currentMeasure === undefined) return;
    
    // Find first note of next measure
    for (let i = this.currentNoteIndex + 1; i < this.sheet.allNotes.length; i++) {
      if (this.sheet.allNotes[i].measure > currentMeasure) {
        this.currentNoteIndex = i;
        return;
      }
    }
    // Already at last measure
  }

  getCurrentNote(): Note | null {
    if (!this.sheet) return null;
    return this.sheet.allNotes[this.currentNoteIndex] || null;
  }

  // Check if a detected note matches the current note
  checkNote(detectedNote: string): boolean {
    const currentNote = this.getCurrentNote();
    if (!currentNote) return false;
    
    if (detectedNote === currentNote.pitch) {
      // Auto-advance to next note
      this.nextNote();
      return true;
    }
    return false;
  }

  private getDisplayMeasures(): { measure: any, opacity: string }[] {
    if (!this.sheet) return [];
    
    const currentMeasure = this.sheet.allNotes[this.currentNoteIndex]?.measure;
    if (currentMeasure === undefined) return [];

    const result = [];
    
    // Previous measure (faded)
    if (currentMeasure > 0) {
      result.push({
        measure: this.sheet.measures[currentMeasure - 1],
        opacity: 'opacity-30'
      });
    }
    
    // Current measure (full opacity)
    result.push({
      measure: this.sheet.measures[currentMeasure],
      opacity: 'opacity-100'
    });
    
    // Next measure (faded)
    if (currentMeasure < this.sheet.measures.length - 1) {
      result.push({
        measure: this.sheet.measures[currentMeasure + 1],
        opacity: 'opacity-30'
      });
    }
    
    return result;
  }

  render() {
    if (!this.sheet) {
      return html`<div class="text-center p-4">Loading sheet music...</div>`;
    }

    const currentNote = this.getCurrentNote();
    const displayMeasures = this.getDisplayMeasures();

    return html`
      <div class="bg-base-100 rounded-2xl p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-2xl font-bold">${this.sheet.title}</h2>
            ${this.sheet.composer ? html`
              <p class="text-sm text-base-content/70">by ${this.sheet.composer}</p>
            ` : ''}
          </div>
          
          <!-- Sheet Selection -->
          <select 
            class="select select-bordered select-sm"
            .value=${this.selectedSheet}
            @change=${(e: Event) => this.loadSheet((e.target as HTMLSelectElement).value)}>
            ${Object.keys(sampleSheets).map(key => html`
              <option value=${key}>
                ${sampleSheets[key].split('\n')[0].substring(2)}
              </option>
            `)}
          </select>
        </div>

        <!-- Current Note Display -->
        <div class="bg-primary/10 rounded-lg p-4 mb-4 text-center">
          <div class="text-sm text-base-content/70 mb-1">Current Note:</div>
          <div class="text-4xl font-bold text-primary">
            ${currentNote ? currentNote.pitch : '--'}
          </div>
          <div class="text-sm text-base-content/60 mt-1">
            Note ${this.currentNoteIndex + 1} of ${this.sheet.allNotes.length}
            (Measure ${(currentNote?.measure || 0) + 1})
          </div>
        </div>

        <!-- Staff Display -->
        <div class="bg-base-200 rounded-lg p-8 mb-4 overflow-x-auto">
          <div class="min-w-[600px]">
            <!-- Time signature and key -->
            <div class="text-sm text-base-content/70 mb-2">
              ${this.sheet.timeSignature} | Key: ${this.sheet.key}
            </div>
            
            <!-- Measures -->
            <div class="flex gap-4 items-center justify-center">
              ${displayMeasures.map(({ measure, opacity }) => html`
                <div class="relative ${opacity} transition-opacity duration-300">
                  <div class="text-xs text-base-content/50 mb-1">
                    Measure ${measure.number + 1}
                  </div>
                  <div class="flex gap-2 items-center min-w-[120px] bg-base-100 p-3 rounded border-2 
                    ${measure.number === currentNote?.measure ? 'border-primary' : 'border-base-300'}">
                    ${measure.notes.map((note: Note) => html`
                      <div class="flex flex-col items-center">
                        <div class="text-2xl font-bold ${
                          note.index === this.currentNoteIndex 
                            ? 'text-primary scale-125' 
                            : 'text-base-content'
                        } transition-all">
                          ${note.pitch}
                        </div>
                        ${note.index === this.currentNoteIndex ? html`
                          <div class="text-primary text-xs mt-1">
                            <span class="icon-[mdi--arrow-up] text-xl"></span>
                          </div>
                        ` : ''}
                      </div>
                    `)}
                  </div>
                </div>
              `)}
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <!-- Navigation by Note -->
          <button 
            class="btn btn-sm btn-outline"
            @click=${this.previousNote}
            ?disabled=${this.currentNoteIndex === 0}>
            <span class="icon-[mdi--chevron-left]"></span>
            Prev Note
          </button>
          <button 
            class="btn btn-sm btn-outline"
            @click=${this.nextNote}
            ?disabled=${this.currentNoteIndex >= this.sheet.allNotes.length - 1}>
            Next Note
            <span class="icon-[mdi--chevron-right]"></span>
          </button>

          <!-- Navigation by Measure -->
          <button 
            class="btn btn-sm btn-outline"
            @click=${this.previousMeasure}
            ?disabled=${this.currentNoteIndex === 0}>
            <span class="icon-[mdi--chevron-double-left]"></span>
            Prev Measure
          </button>
          <button 
            class="btn btn-sm btn-outline"
            @click=${this.nextMeasure}
            ?disabled=${currentNote?.measure === this.sheet.measures.length - 1}>
            Next Measure
            <span class="icon-[mdi--chevron-double-right]"></span>
          </button>
        </div>

        <!-- Additional Controls -->
        <div class="flex gap-2 mt-4 flex-wrap">
          <button 
            class="btn btn-sm btn-primary"
            @click=${this.reset}>
            <span class="icon-[mdi--restore]"></span>
            Reset
          </button>
          <button 
            class="btn btn-sm btn-secondary"
            @click=${this.setBookmark}>
            <span class="icon-[mdi--bookmark]"></span>
            Set Bookmark
          </button>
          <button 
            class="btn btn-sm btn-secondary btn-outline"
            @click=${this.goToBookmark}
            ?disabled=${this.bookmark === this.currentNoteIndex}>
            <span class="icon-[mdi--bookmark-outline]"></span>
            Go to Bookmark (${this.bookmark + 1})
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('music-sheet-display', MusicSheetDisplay);
