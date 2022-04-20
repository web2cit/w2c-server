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
