import React, { useContext } from "react";
import ResultsPageContext from "./ResultsPageContext";
import H, { HeadingLevel } from "./Heading";

interface ResultsHeaderProps {
  domain: string;
  headingLevel?: HeadingLevel;
}

export default function (props: ResultsHeaderProps) {
  const { t, storage, sandbox } = useContext(ResultsPageContext);
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
          <p>
            {t("switch." + (sandbox ? "main" : "sandbox")) + ": "}
            {!sandbox && (
              <>
                <input id="user" placeholder={t("switch.username")}></input>{" "}
              </>
            )}
            <a id="switch" className={sandbox ? "main" : "sandbox"} href="#">
              {/* href="javascript:void(0)"> */}
              {t("switch.switch")}
            </a>
            <script
              dangerouslySetInnerHTML={{ __html: "setSwitch()" }}
            ></script>
          </p>
        </div>
      </p>
    </header>
  );
}
