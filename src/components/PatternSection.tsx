import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import TargetSection from "./TargetSection";
import { TranslationPattern } from "../types";
import H, { HeadingLevel } from "./Heading";

interface PatternSectionProps {
  pattern: TranslationPattern;
  headingLevel?: HeadingLevel;
}

export default function (props: PatternSectionProps) {
  const { t, storage } = useContext(ResultsPageContext);
  const { pattern, label, targets } = props.pattern;
  const patternType = label === undefined ? "unlabelled" : "labelled";
  const headingLevel = props.headingLevel ?? 1;
  return (
    <section className="pattern">
      <H level={headingLevel}>
        {t("pattern", { pattern, label, context: patternType }) + " "}(
        <a
          href={
            storage.instance +
            storage.wiki +
            storage.prefix +
            storage.path +
            storage.filenames.patterns
          }
          target="_blank"
        >
          {t("edit")}
        </a>
        )
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
