import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";
import { HTTPResponseError } from "web2cit";

interface TranslationErrorProps {
  error: Error;
  headingLevel?: HeadingLevel;
}

export default function (props: TranslationErrorProps) {
  const { t } = useContext(ResultsPageContext);
  const error = props.error;
  let description;
  // fixme: we should treat differently 404 errors from target server
  // than from citoid api; see T304773
  if (error instanceof HTTPResponseError) {
    const response = error.response;
    description =
      `${t("error.external")} | ` +
      t("error.external.details", {
        url: error.url,
        code: response.status,
        message: response.statusText,
      });
  } else {
    description = `${error.name}: ${error.message}`;
  }
  return (
    <div>
      <H level={props.headingLevel}>{t("error.targetTranslation")}</H>
      <p>{description}</p>
    </div>
  );
}
