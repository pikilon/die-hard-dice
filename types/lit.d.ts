// Minimal type definitions for Lit library
// This allows the project to work without installing @types packages

declare module 'lit' {
  export class LitElement extends HTMLElement {
    static properties?: Record<string, any>;
    static styles?: any;
    render(): any;
    requestUpdate(): void;
    updated(changedProperties: Map<string, any>): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    shadowRoot: ShadowRoot;
  }

  export function html(strings: TemplateStringsArray, ...values: any[]): any;
  export function css(strings: TemplateStringsArray, ...values: any[]): any;
}
