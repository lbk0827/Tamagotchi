# AI Pet (v0.1 WIP)

Desktop floating Tamagotchi-style AI pet prototype.

## Requirements
- Node.js LTS
- npm

## Install
```bash
npm install
```

## Run (dev)
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Current Scope
- Egg-shaped floating UI shell
- LED-style panel with pet area
- Core status loop (Hunger, Mood, Energy, Cleanliness, Health)
- 4 core actions (Feed, Play, Clean, Sleep)
- Local state save/load (JSON)
- Simple AI-style fallback chat response

## Project Structure
- `src/main`: Electron main/preload
- `src/renderer`: UI and game loop
- `Docs`: MVP and checklist documents
