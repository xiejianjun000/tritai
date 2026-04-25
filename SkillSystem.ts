export class SkillSystem {
  async load(): Promise<void> {}
  async execute(name: string, params: unknown): Promise<unknown> { return null; }
  async list(): Promise<string[]> { return []; }
}
