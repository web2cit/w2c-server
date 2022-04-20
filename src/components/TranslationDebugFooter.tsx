import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";

export interface TranslationDebugFooterProps {
  headingLevel?: HeadingLevel;
}

export default function (props: TranslationDebugFooterProps) {
  const { t } = useContext(ResultsPageContext);
  return (
    <footer>
      <H level={props.headingLevel}>{t("debug")}</H>
    </footer>
  );
}
