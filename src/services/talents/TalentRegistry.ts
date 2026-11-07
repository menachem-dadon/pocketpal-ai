import {TalentEngine} from './types';

/**
 * Name-keyed registry for talent engines.
 *
 * Engines are shared by all chats. Global settings choose which names are
 * advertised in completion schemas and accepted by the agent runner.
 */
export class TalentRegistry {
  private engines = new Map<string, TalentEngine>();

  register(engine: TalentEngine): void {
    this.engines.set(engine.name, engine);
  }

  get(name: string): TalentEngine | undefined {
    return this.engines.get(name);
  }

  has(name: string): boolean {
    return this.engines.has(name);
  }

  /** Return all registered engines. */
  getAll(): TalentEngine[] {
    return Array.from(this.engines.values());
  }

  /** Test helper: clear all registered engines. */
  reset(): void {
    this.engines.clear();
  }
}

export const talentRegistry = new TalentRegistry();
