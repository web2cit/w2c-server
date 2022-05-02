import { TOptions } from "i18next";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export interface HomePageProps {
  t: (key: string, options?: TOptions) => string;
}

export default function (props: HomePageProps) {
  const t = props.t;
  return (
    <html>
      <head>
        <title>{t("web2cit")}</title>
        <link rel="stylesheet" href="/home.css" />
        <script src="/home.js" />
      </head>
      <body>
        <div className="main">
          <div className="wrapper">
            <h1>{t("web2cit")}</h1>
            <h2>{t("home.subheading")}</h2>
            <form>
              <div className="target">
                <input id="url" name="url" placeholder={t("home.target")} />
                <input
                  id="submit"
                  type="submit"
                  value={t("home.extract")}
                  disabled
                />
                <br />
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: t("home.config", {
                    choice: renderToStaticMarkup(
                      <span>
                        <select id="config" name="config">
                          <option value="main">{t("home.config.main")}</option>
                          <option value="sandbox">
                            {t("home.config.sandbox")}
                          </option>
                        </select>
                        <input
                          id="user"
                          name="user"
                          placeholder={t("home.config.user")}
                          disabled
                        />
                      </span>
                    ),
                    interpolation: { escapeValue: false },
                  }),
                }}
              />
              <label>
                <input type="checkbox" name="debug" />
                {t("home.debug")}
              </label>
            </form>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: "initHome();" }} />
      </body>
    </html>
  );
}
