import React from "react";
import { ResultCitation } from "../types";

export interface HeadMetadataProps {
  citations: ResultCitation[];
}

export default function (props: HeadMetadataProps) {
  const citation = props.citations[0];
  if (citation === undefined) {
    return <></>;
  }
  return (
    <>
      <link rel="canonical" href={citation.url} />
      {citation.data.map((datum) => {
        const property = `${datum.prefix}:${datum.field}`;
        return (
          <meta property={property} content={datum.content} key={property} />
        );
      })}
    </>
  );
}
