import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import ResultTable from "./ResultTable";
import { TranslationResult } from "../types";

interface TranslationResultSectionProps {
  translation: TranslationResult;
  index: number;
}

export default function (props: TranslationResultSectionProps) {
  const { t } = useContext(ResultsPageContext);
  const index = props.index + 1;
  const { path, label } = props.translation.template;
  let templateType;
  if (path === undefined) {
    templateType = "fallback";
  } else if (label === undefined) {
    templateType = "unlabelled";
  } else {
    templateType = "labelled";
  }
  return (
    <section className="translation-block">
      <h4>{t("template", { index, label, context: templateType })}</h4>
      {path && (
        <p>
          {t("templatePath", {
            path: <i>{path}</i>,
            interpolation: { escapeValue: false },
          })}
        </p>
      )}
      <ResultTable fields={props.translation.fields} />
    </section>
  );
}
