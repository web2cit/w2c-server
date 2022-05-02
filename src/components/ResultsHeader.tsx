import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";

interface ResultsHeaderProps {
  domain: string;
  headingLevel?: HeadingLevel;
}

export default function (props: ResultsHeaderProps) {
  const { t, storage, query } = useContext(ResultsPageContext);
  const { sandbox } = query;
  return (
    <header>
      <H level={props.headingLevel}>
        <a href="/">Web2Cit</a>
        {" | "}
        {t("header") + " "}
        <i>{props.domain}</i>
      </H>
      <p>
        {t("config", {
          user: sandbox,
          context: sandbox ? "sandbox" : "main",
        }) + " "}
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
        <div id="switch">
          <form action="/translate">
            <input hidden readOnly name="url" value={query.url} />
            <input hidden readOnly name="citoid" value={query.citoid} />
            <input hidden readOnly name="debug" value={query.debug} />
            <input hidden readOnly name="format" value={query.format} />
            <input hidden readOnly name="tests" value={query.tests} />
            <label>
              {t("switch." + (sandbox ? "main" : "sandbox")) + ": "}
              <input
                hidden={sandbox !== undefined}
                id="user"
                name="sandbox"
                placeholder={t("switch.username")}
              />{" "}
              <input
                id="switch"
                className={sandbox ? "main" : "sandbox"}
                type="submit"
                value={t("switch.switch")}
              />
            </label>
          </form>
          <script dangerouslySetInnerHTML={{ __html: "init();" }} />
        </div>
      </p>
    </header>
  );
}
