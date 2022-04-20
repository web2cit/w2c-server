import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import OutputCell from "./OutputCell";
import { TranslationField } from "../types";

interface ResultRowProps {
  field: TranslationField;
  // show notice until tests are supported
  _temp: {
    index: number;
    count: number;
  };
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
      {/* show notice until tests are supported
      <OutputCell output={field.test} /> */}
      {props._temp.index === 0 && (
        <td rowSpan={props._temp.count}>
          {t("tests.unsupported")}
          <br />(
          <a href="https://phabricator.wikimedia.org/T302724" target="_blank">
            T302724
          </a>
          )
        </td>
      )}
      <td>{field.score === undefined ? t("nonApplicable") : field.score}</td>
    </tr>
  );
}
