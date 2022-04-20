import React, { PropsWithChildren } from "react";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeadingLevelProps {
  level?: HeadingLevel;
}

export default function (props: PropsWithChildren<HeadingLevelProps>) {
  const H: `h${HeadingLevel}` = `h${props.level ?? 1}`;
  return <H>{props.children}</H>;
}
