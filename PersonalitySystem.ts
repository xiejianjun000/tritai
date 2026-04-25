export class PersonalitySystem {
  async initialize(): Promise<void> {}
  async getPersonality(): Promise<Record<string, unknown>> { return {}; }
  async updatePersonality(personality: Record<string, unknown>): Promise<void> {}
}
