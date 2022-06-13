import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import ResultRow from "./ResultRow";
import { EditorParams, TranslationField } from "../types";

interface ResultTableProps {
  fields: TranslationField[];
}

export default function (props: ResultTableProps) {
  const { t, storage, schemas } = useContext(ResultsPageContext);
  const templatesEditorParams: EditorParams = {
    instance: storage.instance,
    title: storage.prefix + storage.path + storage.filenames.templates,
    schema: schemas.templates,
  };
  const testsEditorParams: EditorParams = {
    instance: storage.instance,
    title: storage.prefix + storage.path + storage.filenames.tests,
    schema: schemas.tests,
  };
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
            <a
              href={
                "/edit.html?" +
                new URLSearchParams(templatesEditorParams).toString()
              }
              target="_blank"
            >
              {t("edit")}
            </a>
            )
          </th>
          {/* test header */}
          <th>
            {t("testHeader")}
            <br />(
            <a
              href={
                "/edit.html?" +
                new URLSearchParams(testsEditorParams).toString()
              }
              target="_blank"
            >
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
