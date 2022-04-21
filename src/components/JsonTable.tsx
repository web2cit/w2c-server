import React from "react";
import { JSON } from "../types";

interface JsonTableProps {
  json: JSON;
  labels?: JsonLabels;
}

type JsonLabels = {
  true: string;
  false: string;
  null: string;
  emptyArray: string;
  emptyObject: string;
};

export default function (props: JsonTableProps) {
  if (typeof props.json === "object") {
    return <>{formatValue(props.json, props.labels)}</>;
  } else {
    return (
      <table>
        <tbody>
          <tr>
            <td>{formatValue(props.json, props.labels)}</td>
          </tr>
        </tbody>
      </table>
    );
  }
}

function formatValue(
  value: JSON,
  labels: JsonLabels = {
    true: "true",
    false: "false",
    null: "null",
    emptyArray: "Empty array",
    emptyObject: "Empty object",
  }
) {
  if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "boolean") {
    return value ? labels.true : labels.false;
  } else if (value === null) {
    return labels.null;
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      return labels.emptyArray;
    } else {
      return (
        <table className="json-table">
          <tbody>
            {value.map((subvalue, index) => (
              <tr key={index}>
                <td>{formatValue(subvalue, labels)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  } else {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return labels.emptyObject;
    } else {
      return (
        <table className="json">
          <tbody>
            {entries.map(([key, subvalue]) => {
              return (
                <tr key={key}>
                  <th>
                    <span>{key}</span>
                  </th>
                  <td>{formatValue(subvalue, labels)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
  }
}
