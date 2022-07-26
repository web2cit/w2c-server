import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import { TranslationOutput } from "../types";

interface OutputCellProps {
  output: TranslationOutput | undefined;
}

export default function (props: OutputCellProps) {
  const { t } = useContext(ResultsPageContext);
  let output;
  if (props.output === undefined) {
    output = t("nonApplicable");
  } else if (props.output.length === 0) {
    output = "-";
  } else {
    output = (
      <table className="output">
        <tbody>
          {props.output.map((value, index) => (
            <tr key={index}>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <td>{output}</td>;
}
