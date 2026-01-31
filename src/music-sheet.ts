// Music sheet data structures and utilities

export interface Note {
  pitch: string; // e.g., "A4", "D5", "G4"
  duration: number; // in beats (1 = quarter note, 0.5 = eighth note, etc.)
  measure: number; // which measure this note belongs to
  index: number; // overall note index in the piece
}

export interface Measure {
  number: number;
  notes: Note[];
  timeSignature?: string; // e.g., "4/4"
}

export interface MusicSheet {
  title: string;
  composer?: string;
  key: string; // e.g., "C", "G", "D"
  timeSignature: string;
  measures: Measure[];
  allNotes: Note[]; // flattened list of all notes for easy navigation
}

// Simple ABC notation parser (simplified version)
// Format: C D E F | G A B c | ...
// Where | separates measures, lowercase = higher octave
export function parseABCNotation(abcString: string): MusicSheet {
  const lines = abcString.trim().split('\n');
  const metadata: { [key: string]: string } = {};
  let noteString = '';

  // Parse metadata and notes
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('T:')) {
      metadata.title = trimmed.substring(2).trim();
    } else if (trimmed.startsWith('C:')) {
      metadata.composer = trimmed.substring(2).trim();
    } else if (trimmed.startsWith('K:')) {
      metadata.key = trimmed.substring(2).trim();
    } else if (trimmed.startsWith('M:')) {
      metadata.timeSignature = trimmed.substring(2).trim();
    } else if (trimmed && !trimmed.startsWith('%')) {
      noteString += ' ' + trimmed;
    }
  }

  // Default values
  const title = metadata.title || 'Untitled';
  const key = metadata.key || 'C';
  const timeSignature = metadata.timeSignature || '4/4';

  // Parse notes and measures
  const measureStrings = noteString.split('|').filter(m => m.trim());
  const measures: Measure[] = [];
  const allNotes: Note[] = [];
  let noteIndex = 0;

  measureStrings.forEach((measureStr, measureNum) => {
    const noteTokens = measureStr.trim().split(/\s+/);
    const measureNotes: Note[] = [];

    for (const token of noteTokens) {
      if (!token) continue;

      const note = parseNote(token, measureNum, noteIndex);
      if (note) {
        measureNotes.push(note);
        allNotes.push(note);
        noteIndex++;
      }
    }

    if (measureNotes.length > 0) {
      measures.push({
        number: measureNum,
        notes: measureNotes,
        timeSignature: measureNum === 0 ? timeSignature : undefined
      });
    }
  });

  return {
    title,
    composer: metadata.composer,
    key,
    timeSignature,
    measures,
    allNotes
  };
}

// Parse individual note from ABC notation
function parseNote(token: string, measureNum: number, noteIndex: number): Note | null {
  // Simple note mapping (ABC notation uses letters)
  // Uppercase = octave 4, lowercase = octave 5
  const noteMap: { [key: string]: string } = {
    'C': 'C4', 'D': 'D4', 'E': 'E4', 'F': 'F4', 'G': 'G4', 'A': 'A4', 'B': 'B4',
    'c': 'C5', 'd': 'D5', 'e': 'E5', 'f': 'F5', 'g': 'G5', 'a': 'A5', 'b': 'B5',
    '^C': 'C#4', '^D': 'D#4', '^F': 'F#4', '^G': 'G#4', '^A': 'A#4',
    '^c': 'C#5', '^d': 'D#5', '^f': 'F#5', '^g': 'G#5', '^a': 'A#5',
    '_D': 'D4', '_E': 'E4', '_G': 'G4', '_A': 'A4', '_B': 'B4',
    '_d': 'D5', '_e': 'E5', '_g': 'G5', '_a': 'A5', '_b': 'B5',
  };

  // Extract duration if present (e.g., "C2" = half note)
  let noteLetter = token;
  let duration = 1; // default to quarter note

  const durationMatch = token.match(/([0-9/.]+)$/);
  if (durationMatch) {
    const durationStr = durationMatch[1];
    if (durationStr.includes('/')) {
      const parts = durationStr.split('/');
      duration = parseInt(parts[0]) / parseInt(parts[1]);
    } else {
      duration = parseFloat(durationStr);
    }
    noteLetter = token.substring(0, token.length - durationStr.length);
  }

  const pitch = noteMap[noteLetter];
  if (!pitch) {
    return null;
  }

  return {
    pitch,
    duration,
    measure: measureNum,
    index: noteIndex
  };
}

// Sample music sheets
export const sampleSheets: { [key: string]: string } = {
  'twinkle-twinkle': `T:Twinkle Twinkle Little Star
C:Traditional
M:4/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |`,

  'ode-to-joy': `T:Ode to Joy (simplified)
C:Beethoven
M:4/4
K:C
E E F G | G F E D | C C D E | E D D2 |
E E F G | G F E D | C C D E | D C C2 |`,

  'mary-lamb': `T:Mary Had a Little Lamb
C:Traditional
M:4/4
K:C
E D C D | E E E2 | D D D2 | E G G2 |
E D C D | E E E E | D D E D | C2 C2 |`,

  'simple-scale': `T:Simple G Major Scale
C:Exercise
M:4/4
K:G
G A B c | d e ^f g | g ^f e d | c B A G |`
};
