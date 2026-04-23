/**
 * Context Aware Actor Example
 * Demonstrates how an Actor can use the Context Engine
 */

import { Actor, ActorRef, Props } from '../core/actor/Actor';
import { ContextEngine } from '../core/context/ContextEngine';
import { ConversationRequest } from '../core/context/types';

/**
 * An actor that uses context engine to provide better responses
 */
export class ContextAwareActor extends Actor {
  private contextEngine: ContextEngine;

  constructor(contextEngine?: ContextEngine) {
    super();
    this.contextEngine = contextEngine || new ContextEngine();
  }

  /**
   * Processes messages with context awareness
   */
  async receive(message: any, sender: ActorRef | null = null): Promise<any> {
    if (message.type === 'query') {
      return await this.handleQuery(message, sender);
    }

    return super.receive(message, sender);
  }

  /**
   * Handles user queries with context
   */
  private async handleQuery(message: any, sender: ActorRef | null): Promise<any> {
    const request: ConversationRequest = {
      userId: message.userId,
      sessionId: this.context.self.path.name,
      query: message.content,
      tokenBudget: 2000,
    };

    try {
      // Get context for this query
      const injectedPrompt = await this.contextEngine.processAndFillTemplate(request);

      // In real implementation, this would call an LLM
      const response = `Response to: ${message.content}\n\nContext used:\n${injectedPrompt}`;

      // Reply to sender if present
      if (sender) {
        sender.tell({
          type: 'response',
          content: response,
          originalQuery: message.content,
        }, this.context.self);
      }

      return response;
    } catch (error) {
      const errorMsg = `Error processing query: ${error}`;
      if (sender) {
        sender.tell({
          type: 'error',
          content: errorMsg,
          originalQuery: message.content,
        }, this.context.self);
      }
      return errorMsg;
    }
  }

  /**
   * Lifecycle hook: initialize context engine
   */
  async preStart(): Promise<void> {
    await super.preStart();
    console.log(`[ContextAwareActor] ${this.context.self.path.name} started`);
  }

  /**
   * Lifecycle hook: clean up
   */
  async postStop(): Promise<void> {
    console.log(`[ContextAwareActor] ${this.context.self.path.name} stopped`);
    await super.postStop();
  }
}

/**
 * Creates a context aware actor props
 */
export function createContextAwareActorProps(contextEngine?: ContextEngine): Props {
  return Props.create(ContextAwareActor, [contextEngine]);
}

export default ContextAwareActor;