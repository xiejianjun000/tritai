export interface ActorConfig {
  name: string;
  [key: string]: unknown;
}

export class Actor {
  name: string;
  constructor(config: ActorConfig) {
    this.name = config.name;
  }
}

export type ActorRef = Actor;
export type Props = ActorConfig;
