export type TranslationSummary = {
  domain: string;
  patterns: PatternResult[];
  citations: CitationResult[];
};

export type PatternResult = {
  pattern: string | undefined;
  label?: string;
  targets: TargetResult[];
};

export type TargetResult = {
  path: string;
  href?: string;
  pattern?: string;
  results: TranslationResult[];
  error?: Error;
  debug?: DebugJson;
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
    tests?: string;
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

export type EditorParams = {
  instance: string;
  title: string;
  schema: string;
};

interface QueryOptions {
  citoid?: "true" | "false";
  debug?: "true" | "false";
  format?: "html" | "json" | "mediawiki";
  sandbox?: string;
  tests?: "true" | "false";
}
interface DomainQuery extends QueryOptions {
  domain: string; // consider accepting origin instead
  path?: string;
  url?: never;
}
interface UrlQuery extends QueryOptions {
  url: string;
  domain?: never;
  path?: never;
}
export type ReqQuery = DomainQuery | UrlQuery;

export function isReqQuery(query: unknown): query is ReqQuery {
  const { citoid, debug, format, sandbox, tests, domain, path, url } =
    query as ReqQuery;
  if (
    (domain === undefined || typeof domain !== "string") &&
    (url === undefined || typeof url !== "string")
  ) {
    return false;
  } else if (path !== undefined && typeof path !== "string") {
    return false;
  } else if (sandbox !== undefined && typeof sandbox !== "string") {
    return false;
  } else if (citoid !== undefined && citoid !== "true" && citoid !== "false") {
    return false;
  } else if (debug !== undefined && debug !== "true" && debug !== "false") {
    return false;
  } else if (tests !== undefined && tests !== "true" && tests !== "false") {
    return false;
  } else if (
    format !== undefined &&
    format !== "html" &&
    format !== "json" &&
    format !== "mediawiki"
  ) {
    return false;
  } else {
    return true;
  }
}
