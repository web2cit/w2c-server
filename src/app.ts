import express, { RequestHandler } from "express";
import { Domain, Webpage, fallbackTemplate, HTTPResponseError } from "web2cit";
import { makeDebugHtml } from "./debug";
import i18next from "i18next";
import i18nextMiddleware from "i18next-http-middleware";
import Backend from "i18next-fs-backend";

const app = express();
const port = process.env.PORT || 3000;

app.set("views", "./views");
app.set("view engine", "pug");

i18next
  .use(Backend)
  // .use(languageDetector)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    // debug: true,
    // detection: {
    //   order: ['customDetector']
    // },
    backend: {
      loadPath: "./locales/{{lng}}/{{ns}}.json",
      // addPath: __dirname + '/locales/{{lng}}/{{ns}}.missing.json'
    },
    fallbackLng: "en",
    preload: ["en"],
    // nonExplicitSupportedLngs: true,
    // supportedLngs: ['en', 'de'],
    // load: 'languageOnly',
    // saveMissing: true
  });

app.use(i18nextMiddleware.handle(i18next));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// TODO: won't be needed anymore with Express v5
// A wrapper function.
// It takes fn as parameter, with fn an async version of a RequestHandler:
// it takes the same parameters (...args: Parameters<RequestHandler>),
// but returns a promise (Promise<ReturnType<RequestHandler>>).
// It returns a wrapped function (wrappedFn)
// that takes the same parameters as a RequestHandler (req, res. next)
// and returns a promise (Promise<ReturnType<RequestHandler>>)
// with its reject value sent to the "next" function
// see https://expressjs.com/en/advanced/best-practice-performance.html#use-promises
function wrap(
  fn: (
    ...args: Parameters<RequestHandler>
  ) => Promise<ReturnType<RequestHandler>>
) {
  const wrappedFn = function (
    ...args: Parameters<RequestHandler>
  ): Promise<ReturnType<RequestHandler>> {
    const [req, res, next] = args;
    return fn(req, res, next).catch((reason) => {
      next(reason);
    });
  };
  return wrappedFn;
}

async function handler(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1]
) {
  const match = req.url.match(
    /^(?<debug>\/debug)?(?<sandbox>\/sandbox\/(?<user>[^/]+))?\/(?<url>.+)?$/
  );

  if (match === null) {
    res.redirect("/");
    return;
  }

  const { debug, user } = match.groups ?? {};
  let { url } = match.groups ?? {};

  if (url === undefined) {
    // todo: provide an improved landing page
    // maybe with a search field
    // T302698
    res.status(400).send("Specify a target URL");
    return;
  }

  let target;
  try {
    target = new Webpage(url);
  } catch {
    res.status(400).send(`Invalid target URL: ${url}`);
    return;
  }

  url = target.url.href;

  let domain;
  try {
    domain = new Domain(target.domain);
  } catch (error) {
    if (error instanceof Error) {
      res
        .status(400)
        .send(
          `Something may be wrong with the target URL's domain: ${error.message}`
        );
      return;
    } else {
      throw error;
    }
  }

  if (user) {
    // todo: storage root should be given to the Domain constructor
    domain.templates.storage.root = `User:${user}/Web2Cit/data/`;
    domain.patterns.storage.root = `User:${user}/Web2Cit/data/`;
  }

  // consider having an init method
  const templatesRevision = await domain.templates.getLatestRevision();
  if (templatesRevision !== undefined) {
    domain.templates.loadRevision(templatesRevision);
  }
  const patternsRevision = await domain.patterns.getLatestRevision();
  if (patternsRevision !== undefined) {
    domain.patterns.loadRevision(patternsRevision);
  }

  let output;
  try {
    if (debug) {
      output = await domain.translate(target, {
        // return non-applicable template outputs
        onlyApplicable: false,
        //
        templateFieldInfo: true,
      });
    } else {
      output = await domain.translate(target);
    }
  } catch (error) {
    if (error instanceof Error) {
      // fixme: we should treat differently 404 errors from target server
      // than from citoid api
      if (error instanceof HTTPResponseError) {
        const response = error.response;
        res
          .status(response.status)
          .send(
            "<h1>Failed to fetch one of the external resources required to translate the target URL</h1>" +
              `External resource: ${error.url} (Error ${response.status}: ${response.statusText})`
          );
        return;
      }
    }
    throw error;
  }

  // todo: consider changing w2c-core's TranslationOutput
  // to include a citations property
  // see T302431
  type Citation = NonNullable<
    Awaited<
      ReturnType<Domain["translate"]>
    >["translation"]["outputs"][number]["citation"]
  >;

  // todo
  const applicableTemplates = [];
  const citations = output.translation.outputs.reduce(
    (citations: Citation[], output) => {
      const citation = output.citation;
      if (citation !== undefined) citations.push(citation);
      return citations;
    },
    []
  );

  // todo: support multiple citations
  // returned from multiple applicable templates
  // if domain.translate is called with allTemplates = true
  const citation = citations[0];
  if (citation === undefined) {
    // fixes T305166
    res
      .status(404)
      .send(`No applicable translation template found for target webpage.`);
    return;
  }

  // initialize the result object
  const result: Result = {
    domain: domain.domain,
    storage: {
      // todo: the domain object should have a storage property
      // assuming here all configuration objects have the same storage root and path
      instance: domain.templates.mediawiki.instance,
      wiki: domain.templates.mediawiki.wiki,
      prefix: domain.templates.storage.root,
      path: domain.templates.storage.path,
      filenames: {
        templates: domain.templates.storage.filename,
        patterns: domain.patterns.storage.filename,
        // todo: do not hard-code tests filename
        tests: "tests.json",
      },
    },
    patterns: [],
    citations: [],
  };

  // todo: multiple patterns will be needed if multiple targets are supported
  const resultPattern: ResultPattern = {
    // todo: w2c-core should output pattern label
    label: undefined,
    pattern: output.translation.pattern!,
    targets: [],
  };

  const resultTarget: ResultTarget = {
    // todo: support multiple targets
    href: target.url.href,
    path: output.target.path,
    translations: [],
  };

  // fix: get from applicableTemplates array
  const template = output.translation.outputs[0].template;

  // todo: support multiple translations per target
  const resultTranslation: ResultTranslation = {
    template: {
      // todo: w2c-core should output template label
      label: undefined,
      path: template.path,
    },
    fields: [],
  };

  // fixme: w2c-core should output the web2cit citation
  // +1 add Citation object to Web2Cit Core
  // why are we returning JSONs anyway? Why not return full objects?
  output.translation.outputs[0].template.fields?.forEach((field) => {
    if (field.valid) {
      resultTranslation.fields.push({
        name: field.name,
        output: field.output,
      });
    }
  });

  const resultCitation: ResultCitation = {
    url: citation.url,
    data: [],
  };

  (Object.keys(citation) as Array<keyof typeof citation>).forEach((field) => {
    if (field === "key" || field === "version" || field === "source") return;

    let prefix = "z";
    const contents: string[] = [];

    if (field === "tags") {
      const tags = citation[field];
      if (tags === undefined) return;
      tags.forEach((tag) => contents.push(tag.tag));
    } else {
      const value = citation[field];
      if (value === undefined) return;

      if (typeof value === "string") {
        contents.push(value);
      } else {
        value.forEach((item) => {
          if (typeof item === "string") {
            contents.push(item);
          } else {
            item.reverse();
            const creator = item.join(", ");
            contents.push(creator);
            // fixme: support creators other than author
            prefix = "so";
          }
        });
      }
    }
    contents.forEach((content) => {
      // const htmlContent = htmlEncode(content);
      resultCitation.data.push({
        prefix,
        field,
        content,
      });
    });
  });

  resultTarget.translations.push(resultTranslation);
  resultPattern.targets.push(resultTarget);
  result.patterns.push(resultPattern);

  result.citations.push(resultCitation);

  // // create debug output
  // let debugHtml;
  // if (debug) {
  //   debugHtml = makeDebugHtml(
  //     output.translation,
  //     domain.patterns.currentRevid,
  //     domain.templates.currentRevid
  //   );
  // }

  res.render("results", {
    ...result,
    debugHref: debug ? undefined : "/debug" + req.url,
  });

  //   // fixme: publisher mapped to multiple fields ends in extra
  //   res.send(`
  // <!DOCTYPE html>
  // <html
  //   xmlns="http://www.w3.org/1999/xhtml"
  //   prefix="z:http://www.zotero.org/namespaces/export#"
  // >
  // <head>
  //   <link rel="canonical" href="${citation.url}" />
  //   ${metaTags.join("")}
  // </head>
  // <body>
  //   <p>Web2Cit translation for <a href="${url}">${url}</a>:</p>
  //   <ul>
  //   ${items.join("")}
  //   </ul>
  //   <p>Templates configuration: <a href="${templatesPath}">${templatesPath}</a></p>
  //   <p>Patterns configuration: <a href="${patternsPath}">${patternsPath}</a></p>
  //   ${debugHtml}
  // </body>
  // </html>
  //   `);
}
// app.get("/debug/sandbox/:user/:url(*)", wrap(handler));
// app.get("/debug/:url(*)", wrap(handler));
// app.get("/sandbox/:user/:url(*)", wrap(handler));
// app.get("/:url(*)", wrap(handler));
app.get("/*", wrap(handler));

function htmlEncode(text: string): string {
  const map = new Map([
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#039;"],
  ]);
  return text.replace(/[&<>"']/g, (char) => map.get(char) ?? char);
}

app.listen(port, () => {
  console.log(`server is listening on ${port}!`);
});

class RequestError extends Error {
  status?: number;
  // headers: any;
  constructor(message: string) {
    super(message);
  }
}

type Result = {
  domain: string;
  storage: {
    instance: string;
    wiki: string;
    prefix: string;
    path: string;
    filenames: {
      templates: string;
      patterns: string;
      tests: string;
    };
  };
  patterns: ResultPattern[];
  citations: ResultCitation[];
};

type ResultPattern = {
  label?: string;
  pattern: string;
  targets: ResultTarget[];
};

type ResultTarget = {
  href: string;
  path: string;
  translations: ResultTranslation[];
};

type ResultTranslation = {
  template: {
    label?: string;
    path?: string;
  };
  fields: ResultField[];
};

type ResultField = {
  name: string;
  output?: string[];
  test?: string[];
  score?: number;
};

type ResultCitation = {
  url: string;
  data: ResultCitationData[];
};

type ResultCitationData = {
  prefix: string;
  field: string;
  content: string;
};
