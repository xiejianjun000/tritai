/**
 * Context Assembler - Assembles and optimizes context for prompt injection
 */

import { RawContext, OptimizedContext, AssembledContext } from './types';

export class ContextAssembler {
  /**
   * Assembles raw context into a structured format
   */
  assemble(rawContext: RawContext): AssembledContext {
    const memoryString = rawContext.memory.map(m => `- ${m.content}`).join('\n');
    const skillsString = rawContext.skills.map(s => `- ${s.name}: ${s.description}`).join('\n');
    const personalityString = Object.entries(rawContext.personality.preferences)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const prompt = `Context:

Memory:
${memoryString}

Relevant Skills:
${skillsString}

User Preferences:
${personalityString}

System Context:
${rawContext.system ? JSON.stringify(rawContext.system) : 'No system context available'}
`;

    return {
      prompt,
      context: {
        memory: rawContext.memory,
        skills: rawContext.skills,
        personality: rawContext.personality,
      },
      tokenUsage: prompt.length / 4, // Rough token estimate
    };
  }

  /**
   * Optimizes context to fit within token budget
   */
  optimize(rawContext: RawContext, tokenBudget: number): OptimizedContext {
    let totalTokens = 0;
    const optimized: OptimizedContext = {
      truncatedMemory: [],
      truncatedSkills: [],
      truncatedPersonality: {},
      totalTokens: 0,
    };

    // Add memory until budget is reached
    for (const mem of rawContext.memory) {
      const tokenEstimate = mem.content.length / 4;
      if (totalTokens + tokenEstimate < tokenBudget) {
        optimized.truncatedMemory.push(mem);
        totalTokens += tokenEstimate;
      } else {
        break;
      }
    }

    // Add skills until budget is reached
    for (const skill of rawContext.skills) {
      const tokenEstimate = (skill.name + skill.description).length / 4;
      if (totalTokens + tokenEstimate < tokenBudget) {
        optimized.truncatedSkills.push(skill);
        totalTokens += tokenEstimate;
      } else {
        break;
      }
    }

    // Add most important personality traits
    if (totalTokens < tokenBudget) {
      optimized.truncatedPersonality = {
        userId: rawContext.personality.userId,
        preferences: {},
      };
      for (const [key, value] of Object.entries(rawContext.personality.preferences)) {
        const tokenEstimate = (key + String(value)).length / 4;
        if (totalTokens + tokenEstimate < tokenBudget) {
          optimized.truncatedPersonality.preferences[key] = value;
          totalTokens += tokenEstimate;
        } else {
          break;
        }
      }
    }

    optimized.totalTokens = totalTokens;
    return optimized;
  }

  /**
   * Assembles and optimizes context
   */
  assembleAndOptimize(rawContext: RawContext, tokenBudget: number): AssembledContext {
    const optimized = this.optimize(rawContext, tokenBudget);
    
    const memoryString = optimized.truncatedMemory.map(m => `- ${m.content}`).join('\n');
    const skillsString = optimized.truncatedSkills.map(s => `- ${s.name}: ${s.description}`).join('\n');
    const personalityString = Object.entries(optimized.truncatedPersonality.preferences || {})
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const prompt = `Context:

Memory:
${memoryString}

Relevant Skills:
${skillsString}

User Preferences:
${personalityString}

System Context:
${rawContext.system ? JSON.stringify(rawContext.system) : 'No system context available'}
`;

    return {
      prompt,
      context: {
        memory: optimized.truncatedMemory,
        skills: optimized.truncatedSkills,
        personality: optimized.truncatedPersonality,
      },
      tokenUsage: optimized.totalTokens,
    };
  }
}

/**
 * Creates context assembler
 */
export function createContextAssembler(): ContextAssembler {
  return new ContextAssembler();
}

export default ContextAssembler;