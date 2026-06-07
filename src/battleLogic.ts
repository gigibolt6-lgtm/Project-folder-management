export type BattleAttribute = 'neutral' | 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export type BattleStatusId =
  | 'poison'
  | 'burn'
  | 'bleed'
  | 'stun'
  | 'sleep'
  | 'freeze'
  | 'paralysis'
  | 'confusion'
  | 'guard'
  | 'regen';

export interface BattleStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  level?: number;
  mp?: number;
  magicAttack?: number;
  magicDefense?: number;
  accuracy?: number;
  evasion?: number;
  criticalRate?: number;
  criticalDamage?: number;
}

export interface BattleStatusInstance {
  id: BattleStatusId | string;
  remainingTurns: number;
  stacks?: number;
}

export interface BattleActor {
  id: string;
  name: string;
  stats: BattleStats;
  currentHp: number;
  currentMp?: number;
  attribute?: BattleAttribute | string;
  statuses?: BattleStatusInstance[];
}

export interface BattleSkill {
  id: string;
  name: string;
  power: number;
  damageType?: 'physical' | 'magical' | 'fixed';
  attribute?: BattleAttribute | string;
  accuracy?: number;
  criticalRateBonus?: number;
  hitCount?: number;
  mpCost?: number;
  priority?: number;
  healingPower?: number;
  targetStatus?: BattleStatusApplication[];
  selfStatus?: BattleStatusApplication[];
}

export interface BattleStatusApplication {
  id: BattleStatusId | string;
  chance: number;
  duration: number;
  stacks?: number;
  maxStacks?: number;
}

export interface StatusRule {
  id: BattleStatusId | string;
  label: string;
  tickTiming?: 'turnStart' | 'turnEnd';
  damagePerTurnRatio?: number;
  healPerTurnRatio?: number;
  attackMultiplier?: number;
  defenseMultiplier?: number;
  speedMultiplier?: number;
  accuracyMultiplier?: number;
  evasionMultiplier?: number;
  skipTurnChance?: number;
  incomingDamageMultiplier?: number;
  outgoingDamageMultiplier?: number;
  removeOnDamageChance?: number;
  maxStacks?: number;
  stackMode?: 'refresh' | 'add' | 'ignore';
}

export interface BattleConfig {
  random: () => number;
  minimumHitChance: number;
  maximumHitChance: number;
  minimumDamage: number;
  baseCriticalRate: number;
  baseCriticalDamage: number;
  sameAttributeBonus: number;
  levelScalingRatio: number;
  varianceRatio: number;
  attributeCompatibility: Record<string, Record<string, number>>;
  statusRules: Record<string, StatusRule>;
}

export type BattleConfigOverrides = Partial<Omit<BattleConfig, 'attributeCompatibility' | 'statusRules'>> & {
  attributeCompatibility?: Record<string, Record<string, number>>;
  statusRules?: Record<string, Partial<StatusRule>>;
};

export interface BattleEvent {
  type:
    | 'statusTick'
    | 'statusApplied'
    | 'statusExpired'
    | 'statusRemoved'
    | 'turnSkipped'
    | 'attack'
    | 'heal'
    | 'miss'
    | 'mpEmpty'
    | 'defeated';
  actorId?: string;
  targetId?: string;
  statusId?: string;
  amount?: number;
  message: string;
}

export interface BattleTurnResult {
  actor: BattleActor;
  target: BattleActor;
  events: BattleEvent[];
}

export interface BattleActorValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  random: Math.random,
  minimumHitChance: 0.05,
  maximumHitChance: 0.95,
  minimumDamage: 1,
  baseCriticalRate: 0.05,
  baseCriticalDamage: 1.5,
  sameAttributeBonus: 1.1,
  levelScalingRatio: 0.04,
  varianceRatio: 0.08,
  attributeCompatibility: {
    fire: { wind: 1.25, water: 0.75, earth: 1.1 },
    water: { fire: 1.25, earth: 0.75 },
    wind: { earth: 1.25, fire: 0.75 },
    earth: { water: 1.25, wind: 0.75 },
    light: { dark: 1.25 },
    dark: { light: 1.25 },
  },
  statusRules: {
    poison: {
      id: 'poison',
      label: '毒',
      tickTiming: 'turnEnd',
      damagePerTurnRatio: 0.06,
      maxStacks: 5,
      stackMode: 'add',
    },
    burn: {
      id: 'burn',
      label: '火傷',
      tickTiming: 'turnEnd',
      damagePerTurnRatio: 0.04,
      attackMultiplier: 0.85,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    bleed: {
      id: 'bleed',
      label: '出血',
      tickTiming: 'turnEnd',
      damagePerTurnRatio: 0.08,
      maxStacks: 3,
      stackMode: 'add',
    },
    stun: {
      id: 'stun',
      label: 'スタン',
      tickTiming: 'turnStart',
      skipTurnChance: 1,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    sleep: {
      id: 'sleep',
      label: '睡眠',
      tickTiming: 'turnStart',
      skipTurnChance: 1,
      incomingDamageMultiplier: 1.2,
      removeOnDamageChance: 1,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    freeze: {
      id: 'freeze',
      label: '凍結',
      tickTiming: 'turnStart',
      skipTurnChance: 0.7,
      speedMultiplier: 0.5,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    paralysis: {
      id: 'paralysis',
      label: '麻痺',
      tickTiming: 'turnStart',
      skipTurnChance: 0.35,
      speedMultiplier: 0.65,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    confusion: {
      id: 'confusion',
      label: '混乱',
      tickTiming: 'turnStart',
      skipTurnChance: 0.25,
      accuracyMultiplier: 0.75,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    guard: {
      id: 'guard',
      label: 'ガード',
      tickTiming: 'turnEnd',
      incomingDamageMultiplier: 0.65,
      maxStacks: 1,
      stackMode: 'refresh',
    },
    regen: {
      id: 'regen',
      label: '再生',
      tickTiming: 'turnEnd',
      healPerTurnRatio: 0.05,
      maxStacks: 3,
      stackMode: 'add',
    },
  },
};

const mergeAttributeCompatibility = (overrides: BattleConfigOverrides['attributeCompatibility'] = {}) => {
  const merged: BattleConfig['attributeCompatibility'] = { ...DEFAULT_BATTLE_CONFIG.attributeCompatibility };
  for (const [sourceAttribute, targetMap] of Object.entries(overrides)) {
    merged[sourceAttribute] = {
      ...(merged[sourceAttribute] ?? {}),
      ...targetMap,
    };
  }
  return merged;
};

const mergeStatusRules = (overrides: BattleConfigOverrides['statusRules'] = {}) => {
  const merged: BattleConfig['statusRules'] = { ...DEFAULT_BATTLE_CONFIG.statusRules };
  for (const [statusId, ruleOverride] of Object.entries(overrides)) {
    merged[statusId] = {
      id: statusId,
      label: statusId,
      ...(merged[statusId] ?? {}),
      ...ruleOverride,
    };
  }
  return merged;
};

export const createBattleConfig = (overrides: BattleConfigOverrides = {}): BattleConfig => ({
  ...DEFAULT_BATTLE_CONFIG,
  ...overrides,
  attributeCompatibility: mergeAttributeCompatibility(overrides.attributeCompatibility),
  statusRules: mergeStatusRules(overrides.statusRules),
});

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const rollVariance = (config: BattleConfig) => {
  if (config.varianceRatio <= 0) return 1;
  return 1 - config.varianceRatio + config.random() * config.varianceRatio * 2;
};

const getMaxMp = (actor: BattleActor) => Math.max(0, actor.stats.mp ?? 0);

export const normalizeBattleActor = (actor: BattleActor): BattleActor => ({
  ...actor,
  stats: { ...actor.stats },
  currentHp: clamp(Math.round(actor.currentHp), 0, Math.max(1, actor.stats.hp)),
  currentMp: clamp(Math.round(actor.currentMp ?? getMaxMp(actor)), 0, getMaxMp(actor)),
  statuses: actor.statuses?.map(status => ({
    ...status,
    remainingTurns: Math.max(0, Math.round(status.remainingTurns)),
    stacks: Math.max(1, Math.round(status.stacks ?? 1)),
  })).filter(status => status.remainingTurns > 0) ?? [],
});

const cloneActor = (actor: BattleActor): BattleActor => normalizeBattleActor(actor);

const getStatusStacks = (status: BattleStatusInstance) => Math.max(1, status.stacks ?? 1);

const getStatusRule = (config: BattleConfig, status: BattleStatusInstance) => config.statusRules[status.id];

const getLevel = (actor: BattleActor) => Math.max(1, actor.stats.level ?? 1);

export const validateBattleActor = (actor: BattleActor): BattleActorValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredStats: Array<keyof Pick<BattleStats, 'hp' | 'attack' | 'defense' | 'speed'>> = ['hp', 'attack', 'defense', 'speed'];

  for (const statName of requiredStats) {
    const value = actor.stats[statName];
    if (!Number.isFinite(value) || value < 0) errors.push(`${actor.name}: ${statName} must be 0 or greater`);
  }

  if (actor.stats.hp <= 0) errors.push(`${actor.name}: hp must be greater than 0`);
  if ((actor.stats.level ?? 1) < 1) errors.push(`${actor.name}: level must be 1 or greater`);
  if ((actor.stats.mp ?? 0) < 0) errors.push(`${actor.name}: mp must be 0 or greater`);
  if (actor.currentHp > actor.stats.hp) warnings.push(`${actor.name}: currentHp exceeds max hp and will be clamped`);
  if ((actor.currentMp ?? getMaxMp(actor)) > getMaxMp(actor)) warnings.push(`${actor.name}: currentMp exceeds max mp and will be clamped`);
  if ((actor.stats.accuracy ?? 1) > 1.5) warnings.push(`${actor.name}: accuracy is high; expected RPG balance is roughly 0.75-1.25`);
  if ((actor.stats.evasion ?? 0) > 0.75) warnings.push(`${actor.name}: evasion is high; expected RPG balance is roughly 0-0.4`);
  if ((actor.stats.criticalRate ?? DEFAULT_BATTLE_CONFIG.baseCriticalRate) > 0.5) warnings.push(`${actor.name}: criticalRate is high; expected RPG balance is roughly 0-0.25`);

  return { isValid: errors.length === 0, errors, warnings };
};

export const isDefeated = (actor: BattleActor) => actor.currentHp <= 0;

export const canUseSkill = (actor: BattleActor, skill: BattleSkill) => (actor.currentMp ?? getMaxMp(actor)) >= (skill.mpCost ?? 0);

export const calculateEffectiveStats = (actor: BattleActor, config: BattleConfig): Required<BattleStats> => {
  const base: Required<BattleStats> = {
    hp: Math.max(1, actor.stats.hp),
    level: getLevel(actor),
    mp: getMaxMp(actor),
    attack: Math.max(0, actor.stats.attack),
    defense: Math.max(0, actor.stats.defense),
    speed: Math.max(0, actor.stats.speed),
    magicAttack: Math.max(0, actor.stats.magicAttack ?? actor.stats.attack),
    magicDefense: Math.max(0, actor.stats.magicDefense ?? actor.stats.defense),
    accuracy: clamp(actor.stats.accuracy ?? 1, 0, 2),
    evasion: clamp(actor.stats.evasion ?? 0, 0, 0.95),
    criticalRate: clamp(actor.stats.criticalRate ?? config.baseCriticalRate, 0, 1),
    criticalDamage: Math.max(1, actor.stats.criticalDamage ?? config.baseCriticalDamage),
  };

  for (const status of actor.statuses ?? []) {
    const rule = getStatusRule(config, status);
    if (!rule) continue;
    const stacks = getStatusStacks(status);
    base.attack *= Math.pow(rule.attackMultiplier ?? 1, stacks);
    base.defense *= Math.pow(rule.defenseMultiplier ?? 1, stacks);
    base.speed *= Math.pow(rule.speedMultiplier ?? 1, stacks);
    base.accuracy *= Math.pow(rule.accuracyMultiplier ?? 1, stacks);
    base.evasion *= Math.pow(rule.evasionMultiplier ?? 1, stacks);
  }

  return base;
};

const getAttributeMultiplier = (attacker: BattleActor, target: BattleActor, skill: BattleSkill, config: BattleConfig) => {
  const attackAttribute = skill.attribute ?? attacker.attribute ?? 'neutral';
  const targetAttribute = target.attribute ?? 'neutral';
  const compatibility = config.attributeCompatibility[attackAttribute]?.[targetAttribute] ?? 1;
  const sameAttributeBonus = attackAttribute === attacker.attribute && attackAttribute !== 'neutral'
    ? config.sameAttributeBonus
    : 1;
  return compatibility * sameAttributeBonus;
};

const getStatusDamageMultiplier = (actor: BattleActor, config: BattleConfig, direction: 'incoming' | 'outgoing') => {
  return (actor.statuses ?? []).reduce((multiplier, status) => {
    const rule = getStatusRule(config, status);
    if (!rule) return multiplier;
    const stacks = getStatusStacks(status);
    const statusMultiplier = direction === 'incoming'
      ? rule.incomingDamageMultiplier
      : rule.outgoingDamageMultiplier;
    return multiplier * Math.pow(statusMultiplier ?? 1, stacks);
  }, 1);
};

export const calculateDamage = (
  attacker: BattleActor,
  target: BattleActor,
  skill: BattleSkill,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
) => {
  if (skill.healingPower) return 0;
  if (skill.damageType === 'fixed') return Math.max(config.minimumDamage, Math.round(skill.power));

  const attackerStats = calculateEffectiveStats(attacker, config);
  const targetStats = calculateEffectiveStats(target, config);
  const offensiveStat = skill.damageType === 'magical' ? attackerStats.magicAttack : attackerStats.attack;
  const defensiveStat = skill.damageType === 'magical' ? targetStats.magicDefense : targetStats.defense;
  const levelFactor = 1 + Math.max(0, attackerStats.level - targetStats.level) * config.levelScalingRatio;
  const baseDamage = (offensiveStat * (skill.power / 100) + attackerStats.level * 2) * levelFactor;
  const mitigatedDamage = baseDamage * (100 / (100 + Math.max(0, defensiveStat)));
  const attributeDamage = mitigatedDamage * getAttributeMultiplier(attacker, target, skill, config);
  const statusDamage = attributeDamage
    * getStatusDamageMultiplier(attacker, config, 'outgoing')
    * getStatusDamageMultiplier(target, config, 'incoming')
    * rollVariance(config);

  return Math.max(config.minimumDamage, Math.round(statusDamage));
};

export const calculateHealing = (actor: BattleActor, skill: BattleSkill, config: BattleConfig = DEFAULT_BATTLE_CONFIG) => {
  if (!skill.healingPower) return 0;
  const stats = calculateEffectiveStats(actor, config);
  const baseHealing = skill.healingPower + stats.magicAttack * 0.6 + stats.level * 2;
  return Math.max(1, Math.round(baseHealing * rollVariance(config)));
};

const rollHit = (attacker: BattleActor, target: BattleActor, skill: BattleSkill, config: BattleConfig) => {
  const attackerStats = calculateEffectiveStats(attacker, config);
  const targetStats = calculateEffectiveStats(target, config);
  const baseAccuracy = skill.accuracy ?? 1;
  const hitChance = clamp(
    baseAccuracy * attackerStats.accuracy - targetStats.evasion,
    config.minimumHitChance,
    config.maximumHitChance,
  );
  return config.random() <= hitChance;
};

const rollCritical = (attacker: BattleActor, skill: BattleSkill, config: BattleConfig) => {
  const attackerStats = calculateEffectiveStats(attacker, config);
  const criticalRate = clamp(attackerStats.criticalRate + (skill.criticalRateBonus ?? 0), 0, 1);
  return config.random() <= criticalRate ? attackerStats.criticalDamage : 1;
};

const reduceStatusDurations = (actor: BattleActor, config: BattleConfig, events: BattleEvent[]) => {
  const nextStatuses: BattleStatusInstance[] = [];
  for (const status of actor.statuses ?? []) {
    const nextRemainingTurns = status.remainingTurns - 1;
    const rule = getStatusRule(config, status);
    if (nextRemainingTurns <= 0) {
      events.push({
        type: 'statusExpired',
        actorId: actor.id,
        statusId: status.id,
        message: `${actor.name}の${rule?.label ?? status.id}が解除された`,
      });
      continue;
    }
    nextStatuses.push({ ...status, remainingTurns: nextRemainingTurns });
  }
  actor.statuses = nextStatuses;
};

const processStatusTicks = (
  actor: BattleActor,
  timing: Required<StatusRule>['tickTiming'],
  config: BattleConfig,
  events: BattleEvent[],
) => {
  let shouldSkipTurn = false;

  for (const status of actor.statuses ?? []) {
    const rule = getStatusRule(config, status);
    if (!rule || rule.tickTiming !== timing) continue;
    const stacks = getStatusStacks(status);

    if (rule.damagePerTurnRatio) {
      const damage = Math.max(config.minimumDamage, Math.round(actor.stats.hp * rule.damagePerTurnRatio * stacks));
      actor.currentHp = Math.max(0, actor.currentHp - damage);
      events.push({
        type: 'statusTick',
        actorId: actor.id,
        statusId: status.id,
        amount: damage,
        message: `${actor.name}は${rule.label}で${damage}ダメージを受けた`,
      });
    }

    if (rule.healPerTurnRatio) {
      const heal = Math.max(1, Math.round(actor.stats.hp * rule.healPerTurnRatio * stacks));
      actor.currentHp = Math.min(actor.stats.hp, actor.currentHp + heal);
      events.push({
        type: 'statusTick',
        actorId: actor.id,
        statusId: status.id,
        amount: heal,
        message: `${actor.name}は${rule.label}で${heal}回復した`,
      });
    }

    if (rule.skipTurnChance && config.random() <= rule.skipTurnChance) {
      shouldSkipTurn = true;
      events.push({
        type: 'turnSkipped',
        actorId: actor.id,
        statusId: status.id,
        message: `${actor.name}は${rule.label}で行動できない`,
      });
    }
  }

  return shouldSkipTurn;
};

const removeDamageBreakStatuses = (actor: BattleActor, config: BattleConfig, events: BattleEvent[]) => {
  actor.statuses = (actor.statuses ?? []).filter(status => {
    const rule = getStatusRule(config, status);
    if (!rule?.removeOnDamageChance || config.random() > rule.removeOnDamageChance) return true;
    events.push({
      type: 'statusRemoved',
      actorId: actor.id,
      statusId: status.id,
      message: `${actor.name}の${rule.label}がダメージで解除された`,
    });
    return false;
  });
};

const applyStatus = (
  actor: BattleActor,
  application: BattleStatusApplication,
  config: BattleConfig,
  events: BattleEvent[],
) => {
  if (isDefeated(actor) || config.random() > application.chance) return;

  const rule = config.statusRules[application.id];
  const maxStacks = application.maxStacks ?? rule?.maxStacks ?? application.stacks ?? 1;
  const existing = actor.statuses?.find(status => status.id === application.id);

  if (existing) {
    const mode = rule?.stackMode ?? 'refresh';
    if (mode === 'ignore') return;
    existing.remainingTurns = Math.max(existing.remainingTurns, application.duration);
    if (mode === 'add') {
      existing.stacks = clamp((existing.stacks ?? 1) + (application.stacks ?? 1), 1, maxStacks);
    }
  } else {
    actor.statuses = [
      ...(actor.statuses ?? []),
      {
        id: application.id,
        remainingTurns: application.duration,
        stacks: clamp(application.stacks ?? 1, 1, maxStacks),
      },
    ];
  }

  events.push({
    type: 'statusApplied',
    actorId: actor.id,
    statusId: application.id,
    message: `${actor.name}に${rule?.label ?? application.id}を付与した`,
  });
};

export const resolveBattleTurn = (
  sourceActor: BattleActor,
  sourceTarget: BattleActor,
  skill: BattleSkill,
  options: BattleConfigOverrides = {},
): BattleTurnResult => {
  const config = createBattleConfig(options);
  const actor = cloneActor(sourceActor);
  const target = cloneActor(sourceTarget);
  const events: BattleEvent[] = [];

  if (isDefeated(actor) || isDefeated(target)) return { actor, target, events };

  const skipped = processStatusTicks(actor, 'turnStart', config, events);
  if (isDefeated(actor)) {
    events.push({ type: 'defeated', actorId: actor.id, message: `${actor.name}は倒れた` });
    return { actor, target, events };
  }

  if (!skipped) {
    if (!canUseSkill(actor, skill)) {
      events.push({
        type: 'mpEmpty',
        actorId: actor.id,
        message: `${actor.name}はMPが足りず${skill.name}を使えない`,
      });
    } else {
      actor.currentMp = Math.max(0, (actor.currentMp ?? getMaxMp(actor)) - (skill.mpCost ?? 0));
      if (skill.healingPower) {
        const heal = calculateHealing(actor, skill, config);
        actor.currentHp = Math.min(actor.stats.hp, actor.currentHp + heal);
        events.push({
          type: 'heal',
          actorId: actor.id,
          amount: heal,
          message: `${actor.name}は${skill.name}で${heal}回復した`,
        });
      } else {
        const hitCount = Math.max(1, skill.hitCount ?? 1);
        for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
          if (!rollHit(actor, target, skill, config)) {
            events.push({
              type: 'miss',
              actorId: actor.id,
              targetId: target.id,
              message: `${actor.name}の${skill.name}は外れた`,
            });
            continue;
          }

          const criticalMultiplier = rollCritical(actor, skill, config);
          const damage = Math.round(calculateDamage(actor, target, skill, config) * criticalMultiplier);
          target.currentHp = Math.max(0, target.currentHp - damage);
          events.push({
            type: 'attack',
            actorId: actor.id,
            targetId: target.id,
            amount: damage,
            message: `${actor.name}の${skill.name}: ${target.name}に${damage}ダメージ${criticalMultiplier > 1 ? ' (会心)' : ''}`,
          });
          removeDamageBreakStatuses(target, config, events);
          if (isDefeated(target)) {
            events.push({ type: 'defeated', actorId: target.id, message: `${target.name}は倒れた` });
            break;
          }
        }
      }

      if (!isDefeated(target)) for (const application of skill.targetStatus ?? []) applyStatus(target, application, config, events);
      if (!isDefeated(actor)) for (const application of skill.selfStatus ?? []) applyStatus(actor, application, config, events);
    }
  }

  if (!isDefeated(actor)) processStatusTicks(actor, 'turnEnd', config, events);
  if (!isDefeated(target)) processStatusTicks(target, 'turnEnd', config, events);
  reduceStatusDurations(actor, config, events);
  reduceStatusDurations(target, config, events);

  return { actor: normalizeBattleActor(actor), target: normalizeBattleActor(target), events };
};

export const resolveTurnOrder = (actors: BattleActor[], config: BattleConfig = DEFAULT_BATTLE_CONFIG) => {
  return [...actors].sort((left, right) => {
    const leftStats = calculateEffectiveStats(left, config);
    const rightStats = calculateEffectiveStats(right, config);
    const speedDiff = rightStats.speed - leftStats.speed;
    if (speedDiff !== 0) return speedDiff;
    return (right.stats.level ?? 1) - (left.stats.level ?? 1);
  });
};
