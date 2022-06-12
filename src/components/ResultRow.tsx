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
      <th>
        {t("field." + field.name)}
        <br />({field.name})
      </th>
      <OutputCell output={field.output} />
      <OutputCell output={field.test} />
      <td>
        {field.score === undefined
          ? t("nonApplicable")
          : `${Math.round(field.score * 100)}%`}
      </td>
    </tr>
  );
}
