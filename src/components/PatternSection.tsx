import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import TargetSection from "./TargetSection";
import { EditorParams, PatternResult } from "../types";
import H, { HeadingLevel } from "./Heading";

interface PatternSectionProps {
  pattern: PatternResult;
  headingLevel?: HeadingLevel;
}

export default function (props: PatternSectionProps) {
  const { t, storage, schemas } = useContext(ResultsPageContext);
  const { pattern, label, targets } = props.pattern;
  const patternType = label === undefined ? "unlabelled" : "labelled";
  const headingLevel = props.headingLevel ?? 1;
  const editorParams: EditorParams = {
    instance: storage.instance,
    title: storage.prefix + storage.path + storage.filenames.patterns,
    schema: schemas.patterns,
  };
  return (
    <section className="pattern">
      <H level={headingLevel}>
        {pattern !== undefined
          ? t("pattern", { label, context: patternType }) + " " + pattern + " "
          : t("pattern", { context: "undefined" })}
        {pattern !== undefined && (
          <a
            href={"/edit.html?" + new URLSearchParams(editorParams).toString()}
            target="_blank"
          >
            {t("edit")}
          </a>
        )}
      </H>
      {targets.map((target) => (
        <TargetSection
          target={target}
          headingLevel={Math.min(headingLevel + 1, 6) as HeadingLevel}
          key={target.path}
        />
      ))}
    </section>
  );
}
