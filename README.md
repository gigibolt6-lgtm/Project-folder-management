<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GanttFlow

This contains everything you need to run the app locally.

View your app in AI Studio: https://ai.studio/apps/f33c6b90-fbed-4acf-b40a-1037827fcb00

## Run Locally in a Browser

**Prerequisites:** Node.js

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy the local environment file and set your Gemini API key:
   ```sh
   cp .env.example .env.local
   ```
   Then edit `.env.local` and replace `MY_GEMINI_API_KEY` with your Gemini API key.
3. Start the browser development server:
   ```sh
   npm run dev:browser
   ```
4. If the browser does not open automatically, open this URL when running on your own machine:
   ```text
   http://127.0.0.1:3000/
   ```
   In a cloud or container workspace, open the forwarded preview URL for port `3000` instead.

The Vite server binds to `0.0.0.0` so browser previews and container port forwarding can reach it. The browser still opens `127.0.0.1` for local development so the app does not depend on how your OS, proxy, or browser resolves `localhost`.

## Run the Electron App

```sh
npm run dev
```

During development, Electron loads the same Vite dev server at `http://127.0.0.1:3000/`. You can override that URL if needed:

```sh
VITE_DEV_SERVER_URL=http://127.0.0.1:3000 npm run dev:electron
```

## Other Commands

- `npm run dev:web` starts only the Vite web server without opening a browser and binds it to `0.0.0.0:3000`.
- `npm run dev:browser` starts the Vite web server on `0.0.0.0:3000` and opens `http://127.0.0.1:3000/` for local development.
- `npm run dev` starts the Vite web server and the Electron app together.
- `npm run build` creates a production web build in `dist/`.
- `npm run preview` serves the production build on `0.0.0.0:4173` for browser testing; use `http://127.0.0.1:4173/` locally or the forwarded preview URL in a cloud/container workspace.
- `npm run lint` runs the TypeScript type check.

## Battle Logic Module

`src/battleLogic.ts` contains a configurable battle resolution module for turn-based RPG combat.

- RPG character stats now include level, HP, MP, attack, defense, speed, magic attack/defense, accuracy, evasion, critical rate, and critical damage.
- Tune global values with `createBattleConfig`, such as hit-rate caps, minimum damage, critical rates, same-attribute bonus, level scaling, damage variance, attribute compatibility, and status rules.
- Tune statuses through `statusRules`; poison, burn, bleed, stun, sleep, freeze, paralysis, confusion, guard, and regen are included as defaults.
- Use `validateBattleActor` and `normalizeBattleActor` to keep RPG character values internally consistent before battle resolution.
- Pass a deterministic `random` function when running simulations or tests.

`src/testBattle.ts` provides a deterministic sample battle between a hero and an enemy. `src/BattleTestScreen2.tsx` adds an in-app command panel where you can input **通常攻撃**, **フレイムスラッシュ**, and **応急手当** one turn at a time and inspect HP/MP plus battle logs.

Example:

```ts
import { resolveBattleTurn, validateBattleActor } from './src/battleLogic';

const hero = {
  id: 'hero',
  name: 'Hero',
  currentHp: 168,
  currentMp: 38,
  attribute: 'fire',
  stats: {
    level: 12,
    hp: 168,
    mp: 38,
    attack: 42,
    defense: 28,
    speed: 24,
    magicAttack: 26,
    magicDefense: 22,
    accuracy: 0.96,
    evasion: 0.08,
    criticalRate: 0.12,
    criticalDamage: 1.6,
  },
};

const validation = validateBattleActor(hero);
if (!validation.isValid) throw new Error(validation.errors.join(', '));

const result = resolveBattleTurn(
  hero,
  {
    id: 'enemy',
    name: 'Enemy',
    currentHp: 132,
    currentMp: 18,
    attribute: 'wind',
    stats: { level: 10, hp: 132, mp: 18, attack: 35, defense: 20, speed: 20 },
  },
  {
    id: 'flame-slash',
    name: 'Flame Slash',
    power: 125,
    mpCost: 7,
    attribute: 'fire',
    targetStatus: [{ id: 'burn', chance: 0.35, duration: 3 }],
  },
  {
    random: Math.random,
    varianceRatio: 0.06,
    statusRules: {
      burn: { damagePerTurnRatio: 0.05, attackMultiplier: 0.8 },
    },
  },
);
```
