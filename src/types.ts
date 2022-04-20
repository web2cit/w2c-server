export type TranslationSummary = {
  domain: string;
  patterns: TranslationPattern[];
  citations: ResultCitation[];
};

export type TranslationPattern = {
  pattern: string;
  label?: string;
  targets: TranslationTarget[];
};

export type TranslationTarget = {
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

export type ResultCitation = {
  url: string;
  data: CitationData[];
};

type CitationData = {
  prefix: string;
  field: string;
  content: string;
};
