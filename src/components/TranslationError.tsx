import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";

interface TranslationErrorProps {
  error: Error;
  headingLevel?: HeadingLevel;
}

export default function (props: TranslationErrorProps) {
  const { t } = useContext(ResultsPageContext);
  const error = props.error;
  const description = `${error.name}: ${error.message}`;
  return (
    <div className="translation-error">
      <H level={props.headingLevel}>{t("error.targetTranslation")}</H>
      <p>{description}</p>
    </div>
  );
}
