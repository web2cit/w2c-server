export type TranslationSummary = {
  domain: string;
  patterns: PatternResult[];
  citations: CitationResult[];
};

export type PatternResult = {
  pattern: string;
  label?: string;
  targets: TargetResult[];
};

export type TargetResult = {
  href: string;
  path: string;
  results: TranslationResult[];
  debugJson?: DebugJson;
};

export type TranslationResult = {
  template: {
    path?: string;
    label?: string;
  };
  fields: TranslationField[];
};

export type TranslationField = {
  name: string;
  output: TranslationOutput;
  test: TranslationOutput;
  score: number | undefined;
};

export type TranslationOutput = string[] | undefined;

export type CitationResult = {
  url: string;
  data: CitationData[];
};

type CitationData = {
  prefix: string;
  field: string;
  content: string;
};

// https://github.com/microsoft/TypeScript/issues/1897#issuecomment-822032151
export type JSON =
  | string
  | number
  | boolean
  | null
  | JSON[]
  | { [key: string]: JSON };

export type DebugJson = JSON & {
  config: {
    patterns: string;
    templates: string;
  };
  pattern: string;
  templates: DebugTemplate[];
};

export type DebugTemplate = JSON & {
  path: string;
  applicable: boolean | string;
  fields: DebugField[];
};

export type DebugField = JSON & {
  name: string;
  isArray: boolean | string;
  pattern: string;
  required: boolean;
  procedures: DebugProcedure[];
  output: string[];
  valid: boolean;
  applicable: boolean;
};

export type DebugProcedure = JSON & {
  selection: {
    steps: {
      type: string;
      config: string;
      output: string[];
    }[];
    output: string[];
  };
  transformation: {
    steps: {
      type: string;
      config: string;
      itemwise: boolean;
      output: string[];
    }[];
    output: string[];
  };
};
