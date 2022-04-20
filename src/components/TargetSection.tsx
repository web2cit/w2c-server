import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import TranslationResultSection from "./TranslationResultSection";
import TranslationDebugFooter from "./TranslationDebugFooter";
import { TargetResult } from "../types";
import H, { HeadingLevel } from "./Heading";

interface TargetSectionProps {
  target: TargetResult;
  headingLevel?: HeadingLevel;
}

export default function (props: TargetSectionProps) {
  const { t, debug } = useContext(ResultsPageContext);
  const headingLevel = props.headingLevel ?? 1;
  return (
    <section className="target-block">
      <header>
        <H level={headingLevel}>
          {t("target") + " "}
          <a href={props.target.href} target="_blank">
            {props.target.path}
          </a>
        </H>
      </header>
      <main>
        {props.target.results.map((result, index) => (
          <TranslationResultSection
            translation={result}
            index={index}
            headingLevel={(headingLevel + 1) as HeadingLevel}
            key={result.template.path ?? "fallback"}
          />
        ))}
      </main>
      {debug && (
        <TranslationDebugFooter
          headingLevel={(headingLevel + 1) as HeadingLevel}
        />
      )}
    </section>
  );
}
