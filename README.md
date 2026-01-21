# violin-companion

The AI Companion to help kids practice Violin.

## Features

- 🎤 Real-time pitch detection from your violin playing
- 🎵 Visual feedback on the musical staff
- 🎯 Target note selection for focused practice
- ✅ In-tune indicator to help you perfect your pitch
- 📊 Frequency and clarity display

## Technology

Built with:
- **Lit** - Fast, lightweight web components
- **Vite** - Next-generation frontend tooling
- **Web Audio API** - Real-time audio processing
- **Pitchy** - Accurate pitch detection

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- A microphone connected to your computer

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## How to Use

1. Click "Start Listening" and allow microphone access when prompted
2. Select a target note you want to practice (e.g., A4, D4, G4)
3. Play that note on your violin
4. The app will display:
   - The detected note name
   - The frequency in Hz
   - A visual indicator on the staff
   - Green color when you're in tune (within 10 cents)

## Tips for Best Results

- Use the app in a quiet environment
- Position your microphone close to your violin
- Play clear, sustained notes for better detection
- The app works best with single notes (not chords)
