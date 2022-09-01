import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import HeadMetadata from "./HeadMetadata";
import ResultsHeader from "./ResultsHeader";
import PatternSection from "./PatternSection";
import { PatternResult, CitationResult } from "../types";

export interface ResultsPageProps {
  domain: string;
  patterns: PatternResult[];
  citations: CitationResult[];
}

export default function (props: ResultsPageProps) {
  const { t, debug, query } = useContext(ResultsPageContext);
  const params: Record<string, string> = {};
  // ignore undefined query values
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      params[key] = value;
    }
  });
  const debugHref =
    "/translate?" +
    new URLSearchParams({
      ...params,
      debug: "true",
    }).toString();
  const nodebugHref =
    "/translate?" +
    new URLSearchParams({
      ...params,
      debug: "false",
    }).toString();
  const debugEnable = `<a href=${debugHref}>${t("debug.enable")}</a>`;
  const debugDisable = `<a href=${nodebugHref}>${t("debug.disable")}</a>`;
  return (
    <html
      // xmlns="http://www.w3.org/1999/xhtml"
      prefix="z:http://www.zotero.org/namespaces/export#"
    >
      <head>
        <title>{t("title")} - Web2Cit</title>
        <script src="/results.js"></script>
        <link rel="stylesheet" href="/results.css" />
        <HeadMetadata citations={props.citations} />
      </head>
      <body>
        <ResultsHeader domain={props.domain} headingLevel={1} />
        <hr />
        <main>
          {props.patterns.map((pattern) => (
            <PatternSection
              pattern={pattern}
              headingLevel={2}
              key={pattern.pattern}
            />
          ))}
        </main>
        <hr />
        <footer>
          <p
            dangerouslySetInnerHTML={{
              __html: debug
                ? t("debug.disable.description", {
                    disable: debugDisable,
                    interpolation: {
                      escapeValue: false,
                      skipOnVariables: false,
                    },
                  })
                : t("debug.enable.description", {
                    enable: debugEnable,
                    interpolation: {
                      escapeValue: false,
                      skipOnVariables: false,
                    },
                  }),
            }}
          />
        </footer>
      </body>
    </html>
  );
}
