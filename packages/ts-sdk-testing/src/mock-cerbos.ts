export type Effect = 'EFFECT_ALLOW' | 'EFFECT_DENY';

export interface PolicyRule {
  readonly resource: string;
  readonly action: string;
  readonly effect: Effect;
}

export interface CheckDecision {
  readonly resource: string;
  readonly id: string;
  readonly action: string;
  readonly effect: Effect;
}

export class MockCerbos {
  private mode: 'allow-all' | 'deny-all' | 'policy' = 'allow-all';
  private rules: PolicyRule[] = [];
  private readonly decisions: CheckDecision[] = [];

  static allowAll(): MockCerbos {
    const mock = new MockCerbos();
    mock.mode = 'allow-all';
    return mock;
  }

  static denyAll(): MockCerbos {
    const mock = new MockCerbos();
    mock.mode = 'deny-all';
    return mock;
  }

  static withPolicy(rules: PolicyRule[]): MockCerbos {
    const mock = new MockCerbos();
    mock.mode = 'policy';
    mock.rules = [...rules];
    return mock;
  }

  checkResource(kind: string, id: string, action: string): Effect {
    let effect: Effect;

    switch (this.mode) {
      case 'allow-all':
        effect = 'EFFECT_ALLOW';
        break;
      case 'deny-all':
        effect = 'EFFECT_DENY';
        break;
      case 'policy': {
        const match = this.rules.find((r) => r.resource === kind && r.action === action);
        effect = match?.effect ?? 'EFFECT_DENY';
        break;
      }
    }

    this.decisions.push({ resource: kind, id, action, effect });
    return effect;
  }

  getDecisions(): readonly CheckDecision[] {
    return this.decisions;
  }

  reset(): void {
    this.decisions.length = 0;
  }
}
