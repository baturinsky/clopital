declare module 'roadroller' {
  export interface PackerOptions {
    maxMemoryMB?: number;
    allowFreeVars?: boolean;
    [key: string]: unknown;
  }

  export interface PackerInput {
    type: string;
    action: string;
    data: string;
  }

  export interface PackResult {
    firstLine: string;
    secondLine: string;
  }

  export class Packer {
    constructor(inputs: PackerInput[], options?: PackerOptions);
    optimize(level: number): Promise<void>;
    makeDecoder(): Promise<PackResult>;
  }
}