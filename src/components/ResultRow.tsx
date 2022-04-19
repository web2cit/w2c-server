import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import OutputCell from "./OutputCell";
import { TranslationField } from "../types";

interface ResultRowProps {
  field: TranslationField;
}

export default function (props: ResultRowProps) {
  const { t } = useContext(ResultsPageContext);
  const field = props.field;
  return (
    <tr>
      <td>
        {t("field." + field.name)}
        <br />({field.name})
      </td>
      <OutputCell output={field.output} />
      <OutputCell output={field.test} />
      <td>{field.score === undefined ? t("nonApplicable") : field.score}</td>
    </tr>
  );
}
