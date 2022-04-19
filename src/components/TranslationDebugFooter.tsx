import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";

// export interface TranslationDebugFooterProps {
// };

// export default function(props: TranslationDebugFooterProps) {
export default function () {
  const { t } = useContext(ResultsPageContext);
  return (
    <footer>
      <h4>{t("debug")}</h4>
    </footer>
  );
}
