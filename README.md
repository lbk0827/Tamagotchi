# AI Pet (v0.1 WIP)

Desktop floating Tamagotchi-style AI pet prototype.

## Requirements
- Node.js LTS
- npm

## Install
```bash
npm install
```

## Environment
```bash
cp .env.example .env
```
Set `OPENAI_API_KEY` in `.env` to enable real AI replies.
Use `LOG_LEVEL=debug|info|warn|error` to control runtime log verbosity.

## Run (dev)
```bash
npm run dev
```
In dev mode:
- TypeScript changes auto-compile
- HTML/CSS assets auto-copy
- Electron auto-restarts when built files change
- If Electron crashes, `nodemon` waits and auto-restarts after next file change

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
- OpenAI chat integration with automatic fallback response

## Project Structure
- `src/main`: Electron main/preload
- `src/renderer`: UI and game loop
- `Docs`: MVP and checklist documents
