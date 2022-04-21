import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";
import { DebugJson } from "../types";
import JsonTable from "./JsonTable";
import { TFunction } from "i18next";

export interface TranslationDebugFooterProps {
  debugJson: DebugJson;
  headingLevel?: HeadingLevel;
}

export default function (props: TranslationDebugFooterProps) {
  const { t } = useContext(ResultsPageContext);

  return (
    <footer>
      <H level={props.headingLevel}>{t("debug")}</H>
      <JsonTable json={props.debugJson} />
    </footer>
  );
}
