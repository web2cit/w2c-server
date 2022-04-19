import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";

export interface ResultsPageProps {
  domain: string;
  patterns: ResultPattern[];
  citations: ResultCitation[];
}

export default function (props: ResultsPageProps) {
  const { t } = useContext(ResultsPageContext);
  return (
    <html>
      <head>
        <title>{t("title")}</title>
      </head>
      <body>Body</body>
    </html>
  );
}
