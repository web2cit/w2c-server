import React from "react";
import ResultsPageContext, {
  ResultsPageContextValue,
} from "./ResultsPageContext";
import ResultsPage, { ResultsPageProps } from "./ResultsPage";

export default function (props: ResultsPageWrapperProps) {
  return (
    <ResultsPageContext.Provider value={props.context}>
      <ResultsPage data={props.data} />
    </ResultsPageContext.Provider>
  );
}

interface ResultsPageWrapperProps {
  data: ResultsPageProps;
  context: ResultsPageContextValue;
}
