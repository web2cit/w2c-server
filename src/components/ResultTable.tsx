import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import ResultRow from "./ResultRow";
import { TranslationField } from "../types";

interface ResultTableProps {
  fields: TranslationField[];
}

export default function (props: ResultTableProps) {
  const { t, storage } = useContext(ResultsPageContext);
  const rootPath =
    storage.instance + storage.wiki + storage.prefix + storage.path;
  const templatesPath = rootPath + storage.filenames.templates;
  const testsPath = rootPath + storage.filenames.tests;
  return (
    <table className="translation-table">
      <thead>
        <tr>
          {/* field header */}
          <th>{t("fieldHeader")}</th>
          {/* output header */}
          <th>
            {t("outputHeader")}
            <br />(
            <a href={templatesPath} target="_blank">
              {t("edit")}
            </a>
            )
          </th>
          {/* test header */}
          <th>
            {t("testHeader")}
            <br />(
            <a href={testsPath} target="_blank">
              {t("edit")}
            </a>
            )
          </th>
          {/* score header */}
          <th>{t("scoreHeader")}</th>
        </tr>
      </thead>
      <tbody>
        {props.fields.map((field) => (
          <ResultRow field={field} key={field.name} />
        ))}
      </tbody>
    </table>
  );
}
