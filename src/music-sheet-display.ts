import { LitElement, html } from 'lit';
import { state, query } from 'lit/decorators.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface NoteInfo {
  pitch: string; // e.g., "C4", "D5"
  index: number;
}

export class MusicSheetDisplay extends LitElement {
  @state()
  private currentNoteIndex = 0;

  @state()
  private bookmark: number = 0;

  @state()
  private availableScores: { name: string; path: string }[] = [
    { name: 'Twinkle Twinkle Little Star', path: '/scores/twinkle-twinkle.xml' },
    { name: 'Mary Had a Little Lamb', path: '/scores/mary-lamb.xml' }
  ];

  @state()
  private selectedScore = 0;

  @state()
  private isLoading = false;

  @state()
  private errorMessage = '';

  @state()
  private sheetTitle = '';

  @state()
  private sheetComposer = '';

  @query('#osmdContainer')
  private container?: HTMLDivElement;

  private osmd?: OpenSheetMusicDisplay;
  private notes: NoteInfo[] = [];
  private dragCounter = 0;

  // Disable shadow DOM for Tailwind
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadBookmark();
  }

  async firstUpdated() {
    // Wait for the container to be in the DOM and have dimensions
    await this.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (this.container) {
      console.log('Container dimensions:', {
        width: this.container.offsetWidth,
        height: this.container.offsetHeight
      });
    }
    
    await this.loadScore(this.availableScores[this.selectedScore].path);
  }

  private async loadScore(path: string) {
    if (!this.container) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Clear previous instance
      if (this.osmd) {
        this.osmd = undefined;
      }
      this.container.innerHTML = '';

      // Create new OSMD instance
      this.osmd = new OpenSheetMusicDisplay(this.container, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawComposer: false,
        drawCredits: false,
        drawPartNames: false
      });

      await this.osmd.load(path);
      await this.osmd.render();

      // Extract notes from the sheet
      this.extractNotes();
      
      // Extract metadata
      if (this.osmd.sheet) {
        this.sheetTitle = this.osmd.sheet.TitleString || 'Untitled';
        this.sheetComposer = this.osmd.sheet.Composer?.text || '';
      }

      // Restore bookmark if valid
      if (this.bookmark >= this.notes.length) {
        this.bookmark = 0;
        this.saveBookmark();
      }
      this.currentNoteIndex = this.bookmark;

      // Highlight current note
      this.highlightCurrentNote();

    } catch (error) {
      console.error('Error loading score:', error);
      this.errorMessage = 'Failed to load music sheet. Please try another file.';
    } finally {
      this.isLoading = false;
    }
  }

  private extractNotes() {
    this.notes = [];
    if (!this.osmd?.sheet || !this.osmd?.sheet.SourceMeasures) return;

    let noteIndex = 0;
    
    try {
      // Iterate through measures and extract notes
      for (const measure of this.osmd.sheet.SourceMeasures) {
        if (!measure.VerticalSourceStaffEntryContainers) continue;
        
        for (const staffEntry of measure.VerticalSourceStaffEntryContainers) {
          if (!staffEntry.StaffEntries) continue;
          
          for (const entry of staffEntry.StaffEntries) {
            if (!entry || !entry.VoiceEntries) continue;
            
            for (const voiceEntry of entry.VoiceEntries) {
              if (!voiceEntry || !voiceEntry.Notes) continue;
              
              for (const note of voiceEntry.Notes) {
                if (note && !note.isRest() && note.Pitch) {
                  try {
                    const pitch = this.getNoteString(note);
                    if (pitch && pitch.length > 1) { // Valid pitch like "C4"
                      this.notes.push({ pitch, index: noteIndex++ });
                    }
                  } catch (e) {
                    console.warn('Error extracting note:', e);
                  }
                }
              }
            }
          }
        }
      }
      console.log('Extracted notes:', this.notes);
    } catch (error) {
      console.error('Error in extractNotes:', error);
    }
  }

  private getNoteString(note: any): string {
    try {
      // Get the actual pitch information
      const pitch = note.Pitch;
      if (!pitch) return '';
      
      const step = pitch.FundamentalNote;
      const octave = pitch.Octave;
      const alter = pitch.Accidental || 0;
      
      // The step should be 0-6 for C-B
      // OSMD FundamentalNote enum: 0=C, 1=D, 2=E, 3=F, 4=G, 5=A, 6=B
      const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      let noteName = '';
      
      if (step >= 0 && step < 7) {
        noteName = noteNames[step];
      } else {
        // Invalid note, skip it
        return '';
      }
      
      // OSMD uses octave numbering where middle C (C4) is octave 1
      // We need to add 3 to match standard notation
      const standardOctave = octave + 3;
      
      if (alter === 1) noteName += '#';
      // Flats converted to enharmonic sharps for consistency
      else if (alter === -1) {
        const flatToSharp: { [key: string]: string } = {
          'D': 'C#', 'E': 'D#', 'G': 'F#', 'A': 'G#', 'B': 'A#'
        };
        noteName = flatToSharp[noteName] || noteName;
      }
      
      return noteName + standardOctave;
    } catch (error) {
      console.error('Error getting note string:', error);
      return '';
    }
  }

  private highlightCurrentNote() {
    if (!this.osmd) return;

    // Remove previous highlights
    const previousHighlights = this.container?.querySelectorAll('.current-note-highlight');
    previousHighlights?.forEach(el => el.remove());

    // TODO: Use OSMD cursor API to highlight the current note on the staff
    // For now, we rely on the visual indicator showing the current note name
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
    this.dispatchEvent(new CustomEvent('bookmark-set', {
      detail: { index: this.bookmark },
      bubbles: true,
      composed: true
    }));
  }

  goToBookmark() {
    this.currentNoteIndex = this.bookmark;
    this.highlightCurrentNote();
  }

  reset() {
    this.currentNoteIndex = 0;
    this.highlightCurrentNote();
  }

  previousNote() {
    if (this.currentNoteIndex > 0) {
      this.currentNoteIndex--;
      this.highlightCurrentNote();
    }
  }

  nextNote() {
    if (this.currentNoteIndex < this.notes.length - 1) {
      this.currentNoteIndex++;
      this.highlightCurrentNote();
    }
  }

  getCurrentNote(): NoteInfo | null {
    return this.notes[this.currentNoteIndex] || null;
  }

  checkNote(detectedNote: string): boolean {
    const currentNote = this.getCurrentNote();
    if (!currentNote) return false;
    
    if (detectedNote === currentNote.pitch) {
      this.nextNote();
      return true;
    }
    return false;
  }

  private async handleScoreChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.selectedScore = parseInt(select.value);
    await this.loadScore(this.availableScores[this.selectedScore].path);
  }

  // Drag and drop handlers
  private handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter++;
    this.requestUpdate();
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter--;
    this.requestUpdate();
  }

  private async handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter = 0;
    this.requestUpdate();

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.xml') && !file.name.endsWith('.musicxml') && !file.name.endsWith('.mxl')) {
      this.errorMessage = 'Please drop a MusicXML file (.xml, .musicxml, or .mxl)';
      return;
    }

    try {
      const text = await file.text();
      await this.loadScoreFromString(text, file.name);
    } catch (error) {
      console.error('Error loading dropped file:', error);
      this.errorMessage = 'Failed to load the dropped file.';
    }
  }

  private async loadScoreFromString(xmlString: string, filename: string) {
    if (!this.container) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.container.innerHTML = '';
      
      this.osmd = new OpenSheetMusicDisplay(this.container, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawComposer: false,
        drawCredits: false,
        drawPartNames: false
      });

      await this.osmd.load(xmlString);
      await this.osmd.render();

      this.extractNotes();
      
      if (this.osmd.sheet) {
        this.sheetTitle = this.osmd.sheet.TitleString || filename;
        this.sheetComposer = this.osmd.sheet.Composer?.text || '';
      }

      this.currentNoteIndex = 0;
      this.bookmark = 0;
      this.saveBookmark();
      this.highlightCurrentNote();

    } catch (error) {
      console.error('Error loading score from string:', error);
      this.errorMessage = 'Failed to parse the MusicXML file.';
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    const currentNote = this.getCurrentNote();
    const isDragging = this.dragCounter > 0;

    return html`
      <div class="bg-base-100 rounded-2xl p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-2xl font-bold">${this.sheetTitle || 'Music Sheet'}</h2>
            ${this.sheetComposer ? html`
              <p class="text-sm text-base-content/70">by ${this.sheetComposer}</p>
            ` : ''}
          </div>
          
          <!-- Sheet Selection -->
          <select 
            class="select select-bordered select-sm"
            .value=${this.selectedScore.toString()}
            @change=${this.handleScoreChange}>
            ${this.availableScores.map((score, index) => html`
              <option value=${index}>${score.name}</option>
            `)}
          </select>
        </div>

        ${this.errorMessage ? html`
          <div class="alert alert-error mb-4">
            <span class="icon-[mdi--alert-circle]"></span>
            ${this.errorMessage}
          </div>
        ` : ''}

        <!-- Current Note Display -->
        <div class="bg-primary/10 rounded-lg p-4 mb-4 text-center">
          <div class="text-sm text-base-content/70 mb-1">Current Note:</div>
          <div class="text-4xl font-bold text-primary">
            ${currentNote ? currentNote.pitch : '--'}
          </div>
          <div class="text-sm text-base-content/60 mt-1">
            Note ${this.currentNoteIndex + 1} of ${this.notes.length}
          </div>
        </div>

        <!-- Staff Display Container with Drag & Drop -->
        <div 
          class="bg-base-200 rounded-lg p-4 mb-4 min-h-[400px] relative border-2 transition-colors ${
            isDragging ? 'border-primary border-dashed bg-primary/5' : 'border-base-300'
          }"
          @dragenter=${this.handleDragEnter}
          @dragover=${this.handleDragOver}
          @dragleave=${this.handleDragLeave}
          @drop=${this.handleDrop}>
          
          ${this.isLoading ? html`
            <div class="flex items-center justify-center h-64">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          ` : html`
            <div id="osmdContainer" style="width: 100%; min-height: 300px; background: white; border-radius: 8px; padding: 16px;"></div>
            ${isDragging ? html`
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none bg-primary/10">
                <div class="text-center">
                  <span class="icon-[mdi--file-music] text-6xl text-primary mb-2"></span>
                  <p class="text-lg font-bold text-primary">Drop MusicXML file here</p>
                </div>
              </div>
            ` : ''}
            ${!isDragging && this.notes.length === 0 && !this.isLoading ? html`
              <div class="absolute inset-0 flex items-center justify-center text-center text-base-content/60">
                <div>
                  <span class="icon-[mdi--file-music-outline] text-5xl mb-2 block"></span>
                  <p>Drag and drop a MusicXML file here</p>
                  <p class="text-sm">or select a sample song above</p>
                </div>
              </div>
            ` : ''}
          `}
        </div>

        <!-- Controls -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            ?disabled=${this.currentNoteIndex >= this.notes.length - 1}>
            Next Note
            <span class="icon-[mdi--chevron-right]"></span>
          </button>

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
            Bookmark
          </button>
        </div>

        <div class="flex gap-2 mt-2">
          <button 
            class="btn btn-sm btn-secondary btn-outline"
            @click=${this.goToBookmark}
            ?disabled=${this.bookmark === this.currentNoteIndex}>
            <span class="icon-[mdi--bookmark-outline]"></span>
            Go to Bookmark (${this.bookmark + 1})
          </button>
        </div>

        <div class="alert alert-info mt-4">
          <span class="icon-[mdi--information-outline]"></span>
          <div class="text-sm">
            <p><strong>Staff Notation:</strong> Music displayed on a traditional staff with proper note symbols</p>
            <p><strong>Drag & Drop:</strong> Drop MusicXML files (.xml, .musicxml, .mxl) onto the staff area</p>
            <p><strong>Auto-advance:</strong> Play the correct note to automatically move to the next one</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('music-sheet-display', MusicSheetDisplay);
