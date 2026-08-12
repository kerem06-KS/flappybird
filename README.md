# Flappy Bird
 
A browser-based Flappy Bird clone built with HTML5 Canvas and vanilla JavaScript — featuring day/night themes, adjustable difficulty, customizable bird colors, sound effects, and background music.
 
## Features
 
- Classic flap-and-dodge gameplay with tuned physics per difficulty level
- Day and night visual themes, each with a unique parallax city skyline
- Three difficulty levels (Easy, Normal, Hard), each with its own physics feel and saved high score
- Customizable bird appearance (solid colors and striped patterns)
- Sound effects for flapping, scoring, collisions, and UI interactions
- Separate background music for the home screen and for day/night gameplay
- Independent toggles for background music and sound effects (saved between sessions)
- High scores and settings persist locally in your browser
## Getting Started
 
This is a static site — no build step, no package manager, and no server-side code required.
 
### 1. Clone the repository
 
```bash
git clone https://github.com/kerem06-KS/flappybird.git
cd flappybird
```
 
### 2. Run it locally
 
Because the game loads assets (images, sounds) via relative paths, it's best to serve it through a local web server rather than opening `index.html` directly as a `file://` URL — some browsers block local file requests for security reasons.
 
**Option A — Python's built-in server (no install needed if you have Python 3):**
```bash
python3 -m http.server 8000
```
Then open **http://localhost:8000** in your browser.
 
**Option B — VS Code Live Server extension:**
Install the "Live Server" extension, right-click `index.html`, and choose "Open with Live Server."
 
**Option C — Node's `http-server` (if you have Node.js installed):**
```bash
npx http-server .
```
 
### 3. Play
 
- **Flap:** Space bar, click, or tap
- **Settings menu:** adjust difficulty, bird color, theme, and toggle music/sound effects independently
- High scores are tracked per difficulty and saved automatically in your browser's local storage
## Project Structure
 
```
flappybird/
├── index.html          # Main HTML structure (home, game, and settings screens)
├── style.css            # Styling
├── script.js             # Game logic, rendering, and state management
└── assets/
    ├── sounds/          # Sound effect files
    └── music/            # Background music tracks
```
 
## Dependencies
 
Loaded via CDN in `index.html` — no installation required:
 
- [Howler.js](https://howlerjs.com/) — audio playback for sound effects and music
- [Matter.js](https://brm.io/matter-js/) — physics engine (used for visual effects)
## Contributing
 
This project uses feature branches per change (e.g. `audio/sound-effects-and-music`, `quality-fixes`) merged into `master` via pull request. If you'd like to contribute:
 
1. Create a branch off `master` describing your change
2. Make your changes and commit with clear, separated commits per concern
3. Push your branch and open a pull request against `master`
