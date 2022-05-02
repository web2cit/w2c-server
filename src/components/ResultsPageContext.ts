import { createContext } from "react";
import { TOptions } from "i18next";
import { ReqQuery } from "../types";

export type TFunctionLike = (key: string, options?: TOptions) => string;

export type ResultsPageContextValue = {
  t: TFunctionLike;
  debug: boolean;
  query: ReqQuery;
  storage: {
    instance: string;
    wiki: string;
    prefix: string;
    path: string;
    filenames: {
      templates: string;
      patterns: string;
      tests: string;
    };
  };
  schemas: {
    templates: string;
    patterns: string;
    tests: string;
  };
};

const defaultValue: ResultsPageContextValue = {
  t: (key: string) => key,
  debug: false,
  query: { url: "" },
  storage: {
    instance: "",
    wiki: "",
    prefix: "",
    path: "",
    filenames: {
      templates: "",
      patterns: "",
      tests: "",
    },
  },
  schemas: {
    templates: "",
    patterns: "",
    tests: "",
  },
};

const ResultsPageContext = createContext<ResultsPageContextValue>(defaultValue);

export default ResultsPageContext;
