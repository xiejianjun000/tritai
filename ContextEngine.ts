/**
 * Context Engine - Main entry point for context processing
 */

import { ContextScanner } from './ContextScanner';
import { ContextAssembler } from './ContextAssembler';
import { ContextInjector } from './ContextInjector';
import { ConversationRequest, AssembledContext } from './types';

export class ContextEngine {
  private scanner: ContextScanner;
  private assembler: ContextAssembler;
  private injector: ContextInjector;

  constructor(scanner?: ContextScanner, assembler?: ContextAssembler, injector?: ContextInjector) {
    this.scanner = scanner || new ContextScanner();
    this.assembler = assembler || new ContextAssembler();
    this.injector = injector || new ContextInjector();
  }

  /**
   * Processes conversation request and returns assembled context
   */
  async processRequest(request: ConversationRequest): Promise<AssembledContext> {
    // 1. Scan all relevant context
    const rawContext = await this.scanner.scan(request);

    // 2. Assemble context based on token budget
    const tokenBudget = request.tokenBudget || 2000;
    const assembled = this.assembler.assembleAndOptimize(rawContext, tokenBudget);

    return assembled;
  }

  /**
   * Processes request and returns injected prompt
   */
  async processAndInject(
    request: ConversationRequest,
    prompt?: string,
    strategy?: string
  ): Promise<string> {
    const assembled = await this.processRequest(request);
    const finalPrompt = prompt || this.injector.createPromptTemplate();
    
    return this.injector.inject(finalPrompt, assembled, strategy as any);
  }

  /**
   * Processes request and returns filled template
   */
  async processAndFillTemplate(
    request: ConversationRequest,
    template?: string
  ): Promise<string> {
    const assembled = await this.processRequest(request);
    const finalTemplate = template || this.injector.createPromptTemplate();
    
    return this.injector.fillTemplate(finalTemplate, assembled, request.query);
  }

  /**
   * Gets context scanner instance
   */
  getScanner(): ContextScanner {
    return this.scanner;
  }

  /**
   * Gets context assembler instance
   */
  getAssembler(): ContextAssembler {
    return this.assembler;
  }

  /**
   * Gets context injector instance
   */
  getInjector(): ContextInjector {
    return this.injector;
  }
}

/**
 * Creates context engine
 */
export function createContextEngine(): ContextEngine {
  return new ContextEngine();
}

export default ContextEngine;