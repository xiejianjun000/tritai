import { EvolutionSystemConfig } from '../../core/interfaces/IEvolutionSystem';

export class EvolutionSandbox {
  async initialize(config: EvolutionSystemConfig): Promise<void> {}
  async run(fn: () => Promise<void>): Promise<boolean> {
    try { await fn(); return true; } catch { return false; }
  }
  async rollback(): Promise<void> {}
  async validate(): Promise<boolean> { return true; }
}
