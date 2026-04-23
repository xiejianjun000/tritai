/**
 * Context Injector - Injects context into prompts using various strategies
 */

import { AssembledContext, InjectionStrategy } from './types';

export class ContextInjector {
  /**
   * Injects context into prompt using specified strategy
   */
  inject(
    prompt: string,
    assembledContext: AssembledContext,
    strategy: InjectionStrategy = 'prefix'
  ): string {
    switch (strategy) {
      case 'prefix':
        return `${assembledContext.prompt}\n\n${prompt}`;
      
      case 'suffix':
        return `${prompt}\n\n${assembledContext.prompt}`;
      
      case 'inline':
        return prompt.replace('{{CONTEXT}}', assembledContext.prompt);
      
      case 'system-only':
        return assembledContext.prompt;
      
      default:
        return `${assembledContext.prompt}\n\n${prompt}`;
    }
  }

  /**
   * Injects context into system prompt
   */
  injectIntoSystemPrompt(
    systemPrompt: string,
    assembledContext: AssembledContext
  ): string {
    return this.inject(systemPrompt, assembledContext, 'inline');
  }

  /**
   * Creates a prompt template with context placeholders
   */
  createPromptTemplate(): string {
    return `You are an AI assistant. Use the following context to respond to the user's query:

{{CONTEXT}}

User Query: {{QUERY}}

Response:`;
  }

  /**
   * Fills a prompt template with context and query
   */
  fillTemplate(
    template: string,
    assembledContext: AssembledContext,
    query: string
  ): string {
    return template
      .replace('{{CONTEXT}}', assembledContext.prompt)
      .replace('{{QUERY}}', query);
  }
}

/**
 * Creates context injector
 */
export function createContextInjector(): ContextInjector {
  return new ContextInjector();
}

export default ContextInjector;