import { EventEmitter } from 'events';
import { Actor, ActorRef, Props } from './core/actor/Actor';
import { ContextEngine } from './core/context/ContextEngine';
import { ConversationRequest } from './core/context/types';

interface ContextAwareActorProps extends Props {
  contextEngine: ContextEngine;
  userId?: string;
}

export class ContextAwareActor extends Actor {
  private context: any;
  private contextEngine: ContextEngine;
  private userId: string;
  private emitter: EventEmitter;

  constructor(props: ContextAwareActorProps) {
    super(props);
    this.contextEngine = props.contextEngine || new ContextEngine();
    this.userId = props.userId || 'default';
    this.context = { userId: this.userId };
    this.emitter = new EventEmitter();
  }

  async receive(message: unknown): Promise<void> {
    const req: ConversationRequest = {
      content: typeof message === 'string' ? message : JSON.stringify(message),
      context: this.context,
      timestamp: Date.now()
    };

    const filledContext = await this.contextEngine.process(req);
    this.context = filledContext;

    // Process and respond
    const response = { context: this.context, actor: this.name };
    this.tell('response', response);
  }

  tell(event: string, data: unknown): void {
    this.emitter.emit(event, data);
  }

  on(event: string, handler: (data: unknown) => void): void {
    this.emitter.on(event, handler);
  }

  async preStart(): Promise<void> {
    this.context = await this.contextEngine.process({ content: 'init', userId: this.userId });
  }

  async postStop(): Promise<void> {
    this.context = null;
  }
}

