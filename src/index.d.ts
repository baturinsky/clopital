declare namespace JSX {
  // 1. Define the return type of your factory (optional, defaults to any)
  interface Element extends String {} // or just use 'string'

  // 2. Define which intrinsic elements are allowed
  interface IntrinsicElements {
    // This allows any tag name with any props (the quickest fix)
    [elemName: string]: any;
    
    // Or, for better type safety, map to HTMLElementTagNameMap
    // [K in keyof HTMLElementTagNameMap]: any;
  }

  // 3. Define how children are passed (required for TS to understand <div>text</div>)
  interface ElementChildrenAttribute {
    children: {}; // The prop name used for children
  }
}

declare module '*.md' {
    export const plainText: string
}