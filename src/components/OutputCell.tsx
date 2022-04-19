import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import { TranslationOutput } from "../types";

interface OutputCellProps {
  output: TranslationOutput;
}

export default function (props: OutputCellProps) {
  const { t } = useContext(ResultsPageContext);
  return (
    <td>
      {props.output === undefined ? (
        t("nonApplicable")
      ) : (
        <table className="output">
          <tbody>
            {props.output.map((value) => (
              <tr>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </td>
  );
}
