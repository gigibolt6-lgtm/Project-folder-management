import { useMemo, useRef, useState } from 'react';
import { RotateCcw, Swords } from 'lucide-react';
import { BattleActor, BattleConfigOverrides, BattleEvent, BattleSkill, isDefeated, normalizeBattleActor, resolveBattleTurn } from './battleLogic';
import { cn } from './lib/utils';
import {
  createSeededRandom,
  TEST_BATTLE_CONFIG,
  TEST_BATTLE_ENEMY,
  TEST_BATTLE_HERO,
  TEST_BATTLE_SKILLS,
  validateTestBattleActors,
} from './testBattle';

interface BattleCommand {
  id: string;
  label: string;
  description: string;
  skill: BattleSkill;
}

interface CommandLogEntry {
  id: string;
  actorName: string;
  skillName: string;
  events: BattleEvent[];
  heroHp: number;
  heroMp: number;
  enemyHp: number;
  enemyMp: number;
}

interface BattleTestState {
  hero: BattleActor;
  enemy: BattleActor;
  logs: CommandLogEntry[];
  winner: 'hero' | 'enemy' | null;
  commandCount: number;
}

const createInitialState = (): BattleTestState => ({
  hero: normalizeBattleActor(TEST_BATTLE_HERO),
  enemy: normalizeBattleActor(TEST_BATTLE_ENEMY),
  logs: [],
  winner: null,
  commandCount: 0,
});

const battleCommands: BattleCommand[] = [
  {
    id: 'normal-attack',
    label: '通常攻撃',
    description: 'MPを使わない基本攻撃',
    skill: TEST_BATTLE_SKILLS.slash,
  },
  {
    id: 'flame-slash',
    label: 'フレイムスラッシュ',
    description: 'MP7 / 火属性・火傷付与',
    skill: TEST_BATTLE_SKILLS.flameSlash,
  },
  {
    id: 'first-aid',
    label: '応急手当',
    description: 'MP8 / 自分を回復',
    skill: TEST_BATTLE_SKILLS.firstAid,
  },
];

const selectEnemySkill = (enemy: BattleActor) => {
  if ((enemy.currentMp ?? 0) >= (TEST_BATTLE_SKILLS.poisonNeedle.mpCost ?? 0)) return TEST_BATTLE_SKILLS.poisonNeedle;
  return TEST_BATTLE_SKILLS.club;
};

const resolveWinner = (hero: BattleActor, enemy: BattleActor): BattleTestState['winner'] => {
  if (isDefeated(enemy) && !isDefeated(hero)) return 'hero';
  if (isDefeated(hero) && !isDefeated(enemy)) return 'enemy';
  return null;
};

const applyTurnToState = (
  currentHero: BattleActor,
  currentEnemy: BattleActor,
  actor: BattleActor,
  target: BattleActor,
  skill: BattleSkill,
  options: BattleConfigOverrides,
  logId: string,
) => {
  const result = resolveBattleTurn(actor, target, skill, options);
  const nextHero = actor.id === currentHero.id ? result.actor : result.target;
  const nextEnemy = actor.id === currentEnemy.id ? result.actor : result.target;

  return {
    hero: nextHero,
    enemy: nextEnemy,
    log: {
      id: logId,
      actorName: actor.name,
      skillName: skill.name,
      events: result.events,
      heroHp: nextHero.currentHp,
      heroMp: nextHero.currentMp ?? 0,
      enemyHp: nextEnemy.currentHp,
      enemyMp: nextEnemy.currentMp ?? 0,
    } satisfies CommandLogEntry,
  };
};

const HpMpPanel = ({ actor, tone }: { actor: BattleActor; tone: 'hero' | 'enemy' }) => {
  const hpRatio = Math.max(0, Math.min(1, actor.currentHp / actor.stats.hp));
  const maxMp = actor.stats.mp ?? 0;
  const mpRatio = maxMp > 0 ? Math.max(0, Math.min(1, (actor.currentMp ?? 0) / maxMp)) : 0;

  return (
    <div className={cn(
      'rounded-lg border p-2',
      tone === 'hero' ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'
    )}>
      <div className={cn('text-[10px] font-bold', tone === 'hero' ? 'text-blue-700' : 'text-red-700')}>
        {actor.name}
      </div>
      <div className="mt-1 space-y-1">
        <div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>HP</span>
            <span>{actor.currentHp}/{actor.stats.hp}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${hpRatio * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>MP</span>
            <span>{actor.currentMp ?? 0}/{maxMp}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: `${mpRatio * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const BattleTestScreen2 = () => {
  const randomRef = useRef(createSeededRandom(20260607));
  const [battleState, setBattleState] = useState<BattleTestState>(() => createInitialState());
  const validationMessages = useMemo(() => validateTestBattleActors(), []);

  const resetBattle = () => {
    randomRef.current = createSeededRandom(20260607);
    setBattleState(createInitialState());
  };

  const handleCommand = (command: BattleCommand) => {
    setBattleState(prev => {
      if (prev.winner) return prev;

      const options: BattleConfigOverrides = {
        ...TEST_BATTLE_CONFIG,
        random: randomRef.current,
      };
      const playerTurn = applyTurnToState(
        prev.hero,
        prev.enemy,
        prev.hero,
        prev.enemy,
        command.skill,
        options,
        `player-${prev.commandCount + 1}`,
      );
      const logs = [
        ...prev.logs,
        playerTurn.log,
      ];
      const playerWinner = resolveWinner(playerTurn.hero, playerTurn.enemy);
      if (playerWinner) {
        return {
          hero: playerTurn.hero,
          enemy: playerTurn.enemy,
          logs,
          winner: playerWinner,
          commandCount: prev.commandCount + 1,
        };
      }

      const enemySkill = selectEnemySkill(playerTurn.enemy);
      const enemyTurn = applyTurnToState(
        playerTurn.hero,
        playerTurn.enemy,
        playerTurn.enemy,
        playerTurn.hero,
        enemySkill,
        options,
        `enemy-${prev.commandCount + 1}`,
      );

      return {
        hero: enemyTurn.hero,
        enemy: enemyTurn.enemy,
        logs: [...logs, enemyTurn.log],
        winner: resolveWinner(enemyTurn.hero, enemyTurn.enemy),
        commandCount: prev.commandCount + 1,
      };
    });
  };

  return (
    <section className="pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Swords size={14} className="text-red-500" />
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">BattleTestScreen2</label>
        </div>
        <button
          type="button"
          onClick={resetBattle}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 transition-colors"
        >
          <RotateCcw size={12} />
          リセット
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <HpMpPanel actor={battleState.hero} tone="hero" />
          <HpMpPanel actor={battleState.enemy} tone="enemy" />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-bold text-gray-500">コマンド入力</div>
            {battleState.winner && (
              <div className="text-[10px] font-bold text-amber-600">
                勝者: {battleState.winner === 'hero' ? '勇者' : '敵'}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            {battleCommands.map(command => {
              const mpCost = command.skill.mpCost ?? 0;
              const isMpShort = (battleState.hero.currentMp ?? 0) < mpCost;
              const isDisabled = Boolean(battleState.winner) || isMpShort;

              return (
                <button
                  key={command.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleCommand(command)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    isDisabled
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                      : 'border-red-100 bg-red-50 text-red-900 hover:border-red-300 hover:bg-red-100'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{command.label}</span>
                    <span className="text-[10px] font-semibold">MP {mpCost}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] opacity-75">
                    {isMpShort ? 'MPが足りません' : command.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-gray-900 text-gray-100 p-2 max-h-52 overflow-y-auto text-[11px] leading-relaxed font-mono">
          {validationMessages.length > 0 && (
            <div className="text-yellow-200 mb-1">{validationMessages.join(' / ')}</div>
          )}
          {battleState.logs.length === 0 ? (
            <div className="text-gray-400">通常攻撃などのコマンドを選択してください。</div>
          ) : (
            battleState.logs.flatMap(log =>
              log.events.map((event, index) => (
                <div key={`${log.id}-${index}`}>
                  {log.actorName} [{log.skillName}] {event.message}
                </div>
              ))
            )
          )}
        </div>
      </div>
    </section>
  );
};
