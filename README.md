<p align="center">
  <img src="docs/images/glitch05.png" alt="Glitch" width="768" />
</p>

<h1 align="center">poqpoq Glitch</h1>

<p align="center">
  <img src="https://img.shields.io/badge/babylon.js-8.x-E44D26?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6TTIgMTdsIDEwIDUgMTAtNSIvPjwvc3ZnPg==&logoColor=white" alt="Babylon.js 8.x" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

<p align="center"><b>The <code>console.log()</code> of 3D authoring.</b></p>

---

Glitch is a minimal, embeddable, special-purpose 3D viewer for the [BlackBox](https://github.com/increasinglyHuman) creative suite. It provides a ground-level experience window that any BlackBox tool can spawn to preview its output.

Glitch instances are ephemeral. They receive data on spawn, execute in isolation, and vanish when closed. Nothing persists. Nothing saves. Nothing networks.

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_WHAT_IT_DOES-000?style=for-the-badge" alt="What It Does" />
</p>

A Terraformer user sculpts a canyon. They press a button. A Glitch spawns. They're standing at the bottom of their canyon, looking up. The walls feel imposing. They press Escape, adjust the erosion depth, and check again. The whole cycle takes five seconds.

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_WHAT_IT_IS-000?style=for-the-badge" alt="What It Is" />
</p>

- A **disposable simulation bubble** — spawn, use, discard
- A **ground-level experience** — you are *in* the scene, not above it
- A **proof window** — answers "does this look right?" and "does this work?"
- A **dependency of other tools** — never launched directly by users

**What It Is Not:**
- Not a world — no persistence, no saving, no loading
- Not a game — no progression, no inventory, no goals
- Not an editor — no modification tools, no brush modes
- Not configurable — no settings panel, no preferences

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_GLITCH_TYPES-000?style=for-the-badge" alt="Glitch Types" />
</p>

| Type | Purpose | Camera |
|------|---------|--------|
| `terraformer` | Walk your sculpted terrain | Over-the-shoulder |
| `landscaper` | Walk through scattered vegetation | Over-the-shoulder |
| `scripter` | Watch scripts execute in 3D | OTS or Orbit |
| `animator` | See animations in context with scale reference | Orbit |
| `generic` | Blank canvas for testing | Orbit |

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_TECH_STACK-000?style=for-the-badge" alt="Tech Stack" />
</p>

- **Engine:** [Babylon.js](https://www.babylonjs.com/) (WebGPU first, WebGL2 fallback)
- **Language:** TypeScript (strict)
- **Build:** Vite
- **Physics:** Cannon.js (via Babylon.js)
- **Scripting:** SES sandboxed compartments (from BlackBox Scripter)
- **Target:** ES2022, single bundle + assets

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_QUICK_START-000?style=for-the-badge" alt="Quick Start" />
</p>

```bash
npm install
npm run dev
```

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_EMBEDDING-000?style=for-the-badge" alt="Embedding" />
</p>

Glitch is designed to be embedded via iframe by parent tools:

```html
<iframe src="https://poqpoq.com/glitch/" id="glitch-frame"></iframe>

<script>
const frame = document.getElementById('glitch-frame');
frame.contentWindow.postMessage({
    type: 'glitch_spawn',
    payload: {
        glitchType: 'terraformer',
        label: 'Canyon Preview',
        terrain: { /* heightmap data */ },
        spawnPoint: { x: 128, y: 0, z: 128 }
    }
}, 'https://poqpoq.com');
</script>
```

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_BLACKBOX_ECOSYSTEM-000?style=for-the-badge" alt="BlackBox Ecosystem" />
</p>

| Tool | What Glitch Does For It |
|------|------------------------|
| [Terraformer](https://github.com/increasinglyHuman/BlackBoxTerrains) | Walk the terrain you just sculpted |
| [Landscaper](https://github.com/increasinglyHuman/Landscaper) | Walk through your scattered forests |
| [Animator](https://github.com/increasinglyHuman/blackBoxIKStudio) | See animations at ground level with scale reference |
| [World](https://github.com/increasinglyHuman/poqpoq-world) | Lightweight preview instances |

---

<p align="center">
  <img src="https://img.shields.io/badge/▸_LICENSE-000?style=for-the-badge" alt="License" />
</p>

[MIT](LICENSE) — Copyright (c) 2026 Allen Partridge (p0qp0q)

All bundled assets (mannequin model, animations, environment map) are CC0 or original works included under the same MIT license.
