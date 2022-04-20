import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import ResultTable from "./ResultTable";
import { TranslationResult } from "../types";
import H, { HeadingLevel } from "./Heading";

interface TranslationResultSectionProps {
  translation: TranslationResult;
  index: number;
  headingLevel?: HeadingLevel;
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
      <H level={props.headingLevel}>
        {t("template", { index, label, context: templateType })}
      </H>
      {path && (
        <p>
          {t("templatePath") + " "}
          <i>{path}</i>
        </p>
      )}
      <ResultTable fields={props.translation.fields} />
    </section>
  );
}
