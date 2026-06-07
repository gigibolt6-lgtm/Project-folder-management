import {
  BattleActor,
  BattleConfigOverrides,
  BattleEvent,
  BattleSkill,
  createBattleConfig,
  isDefeated,
  normalizeBattleActor,
  resolveBattleTurn,
  resolveTurnOrder,
  validateBattleActor,
} from './battleLogic';

export interface TestBattleRoundLog {
  round: number;
  actorName: string;
  skillName: string;
  events: BattleEvent[];
  heroHp: number;
  heroMp: number;
  enemyHp: number;
  enemyMp: number;
}

export interface TestBattleResult {
  winner: 'hero' | 'enemy' | 'draw';
  rounds: TestBattleRoundLog[];
  finalHero: BattleActor;
  finalEnemy: BattleActor;
  validationMessages: string[];
}

export const TEST_BATTLE_HERO: BattleActor = {
  id: 'hero-knight',
  name: 'テスト勇者',
  attribute: 'fire',
  currentHp: 168,
  currentMp: 38,
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

export const TEST_BATTLE_ENEMY: BattleActor = {
  id: 'enemy-goblin',
  name: '訓練ゴブリン',
  attribute: 'wind',
  currentHp: 132,
  currentMp: 18,
  stats: {
    level: 10,
    hp: 132,
    mp: 18,
    attack: 35,
    defense: 20,
    speed: 20,
    magicAttack: 14,
    magicDefense: 16,
    accuracy: 0.9,
    evasion: 0.06,
    criticalRate: 0.08,
    criticalDamage: 1.45,
  },
};

export const TEST_BATTLE_SKILLS: Record<string, BattleSkill> = {
  slash: {
    id: 'slash',
    name: '通常攻撃',
    power: 105,
    damageType: 'physical',
    accuracy: 0.96,
  },
  flameSlash: {
    id: 'flame-slash',
    name: 'フレイムスラッシュ',
    power: 125,
    damageType: 'physical',
    attribute: 'fire',
    accuracy: 0.92,
    mpCost: 7,
    targetStatus: [{ id: 'burn', chance: 0.35, duration: 3 }],
  },
  firstAid: {
    id: 'first-aid',
    name: '応急手当',
    power: 0,
    healingPower: 34,
    mpCost: 8,
  },
  club: {
    id: 'club',
    name: 'こん棒',
    power: 95,
    damageType: 'physical',
    accuracy: 0.9,
  },
  poisonNeedle: {
    id: 'poison-needle',
    name: '毒針',
    power: 72,
    damageType: 'physical',
    accuracy: 0.88,
    mpCost: 4,
    targetStatus: [{ id: 'poison', chance: 0.45, duration: 4 }],
  },
};

export const TEST_BATTLE_CONFIG: BattleConfigOverrides = {
  random: createSeededRandom(20260607),
  varianceRatio: 0.06,
  statusRules: {
    poison: { damagePerTurnRatio: 0.045, maxStacks: 3 },
    burn: { damagePerTurnRatio: 0.035, attackMultiplier: 0.9 },
  },
};

export function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const chooseHeroSkill = (hero: BattleActor) => {
  if (hero.currentHp <= hero.stats.hp * 0.35 && (hero.currentMp ?? 0) >= (TEST_BATTLE_SKILLS.firstAid.mpCost ?? 0)) {
    return TEST_BATTLE_SKILLS.firstAid;
  }
  if ((hero.currentMp ?? 0) >= (TEST_BATTLE_SKILLS.flameSlash.mpCost ?? 0)) return TEST_BATTLE_SKILLS.flameSlash;
  return TEST_BATTLE_SKILLS.slash;
};

const chooseEnemySkill = (enemy: BattleActor) => {
  if ((enemy.currentMp ?? 0) >= (TEST_BATTLE_SKILLS.poisonNeedle.mpCost ?? 0)) return TEST_BATTLE_SKILLS.poisonNeedle;
  return TEST_BATTLE_SKILLS.club;
};

const replaceActor = (source: BattleActor, updated: BattleActor, candidate: BattleActor) => (
  source.id === candidate.id ? updated : source
);

export const validateTestBattleActors = () => [TEST_BATTLE_HERO, TEST_BATTLE_ENEMY]
  .map(normalizeBattleActor)
  .flatMap(actor => {
    const result = validateBattleActor(actor);
    return [...result.errors, ...result.warnings];
  });

export function runTestBattle(options: BattleConfigOverrides = {}): TestBattleResult {
  const random = options.random ?? createSeededRandom(20260607);
  const configOptions: BattleConfigOverrides = { ...TEST_BATTLE_CONFIG, ...options, random };
  const config = createBattleConfig(configOptions);
  let hero = normalizeBattleActor(TEST_BATTLE_HERO);
  let enemy = normalizeBattleActor(TEST_BATTLE_ENEMY);
  const validationMessages = validateTestBattleActors();
  const rounds: TestBattleRoundLog[] = [];

  for (let round = 1; round <= 12 && !isDefeated(hero) && !isDefeated(enemy); round += 1) {
    const actingOrder = resolveTurnOrder([hero, enemy], config);

    for (const activeActor of actingOrder) {
      if (isDefeated(hero) || isDefeated(enemy)) break;
      const isHeroTurn = activeActor.id === hero.id;
      const actor = isHeroTurn ? hero : enemy;
      const target = isHeroTurn ? enemy : hero;
      if (isDefeated(actor)) continue;

      const skill = isHeroTurn ? chooseHeroSkill(actor) : chooseEnemySkill(actor);
      const turn = resolveBattleTurn(actor, target, skill, configOptions);

      hero = replaceActor(hero, turn.actor, actor);
      hero = replaceActor(hero, turn.target, target);
      enemy = replaceActor(enemy, turn.actor, actor);
      enemy = replaceActor(enemy, turn.target, target);

      rounds.push({
        round,
        actorName: actor.name,
        skillName: skill.name,
        events: turn.events,
        heroHp: hero.currentHp,
        heroMp: hero.currentMp ?? 0,
        enemyHp: enemy.currentHp,
        enemyMp: enemy.currentMp ?? 0,
      });
    }
  }

  const winner = isDefeated(enemy) && !isDefeated(hero)
    ? 'hero'
    : isDefeated(hero) && !isDefeated(enemy)
      ? 'enemy'
      : 'draw';

  return {
    winner,
    rounds,
    finalHero: hero,
    finalEnemy: enemy,
    validationMessages,
  };
}
