import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";

interface ResultsHeaderProps {
  domain: string;
  headingLevel?: HeadingLevel;
}

export default function (props: ResultsHeaderProps) {
  const { t, storage } = useContext(ResultsPageContext);
  return (
    <header>
      <H level={props.headingLevel}>
        <a href="/">Web2Cit</a>
        {" | "}
        {t("header") + " "}
        <i>{props.domain}</i>
      </H>
      <p>
        {t("config") + " "}
        <a
          href={
            storage.instance +
            storage.wiki +
            "Special:PrefixIndex/" +
            storage.prefix +
            storage.path
          }
          target="_blank"
        >
          {storage.instance + storage.wiki + storage.prefix}
        </a>
      </p>
    </header>
  );
}
