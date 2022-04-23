import express, { RequestHandler } from "express";
import { Domain, Webpage, HTTPResponseError } from "web2cit";
import i18next from "i18next";
import i18nextMiddleware from "i18next-http-middleware";
import Backend from "i18next-fs-backend";
import { renderToStaticMarkup } from "react-dom/server";
import ResultsPageWrapper from "./components/ResultsPageWrapper";
import {
  PatternResult,
  TargetResult,
  TranslationResult,
  CitationResult,
} from "./types";
import { TranslationOutput } from "web2cit/dist/domain/domain";
import { makeDebugJson } from "./debug";

const SCHEMAS_PATH =
  "https://raw.githubusercontent.com/web2cit/w2c-core/main/schema/";

const app = express();
const port = process.env.PORT || 3000;

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
    // saveMissing: true,
    keySeparator: false,
  });

app.use(i18nextMiddleware.handle(i18next));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.static("public"));

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
  const { url } = match.groups ?? {};

  if (url === undefined) {
    // todo: provide an improved landing page
    // maybe with a search field
    // T302698
    res.status(400).send(req.t("error.noTarget"));
    return;
  }

  // multiple targets should be supported, for example to show translation
  // results for all test webpages defined for a domain
  let target;
  try {
    target = new Webpage(url);
  } catch {
    res.status(400).send(`${req.t("error.invalidTarget")}: ${url}`);
    return;
  }

  let domain;
  try {
    domain = new Domain(target.domain);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send(`${req.t("error.domain")}: ${error.message}`);
      return;
    } else {
      throw error;
    }
  }

  if (user) {
    // todo: storage root should be given to the Domain constructor (T306553)
    domain.templates.storage.root = `User:${user}/Web2Cit/data/`;
    domain.patterns.storage.root = `User:${user}/Web2Cit/data/`;
  }

  // todo: consider having an init method (T306555)
  const templatesRevision = await domain.templates.getLatestRevision();
  if (templatesRevision !== undefined) {
    domain.templates.loadRevision(templatesRevision);
  }
  const patternsRevision = await domain.patterns.getLatestRevision();
  if (patternsRevision !== undefined) {
    domain.patterns.loadRevision(patternsRevision);
  }

  const targetOutputs: Awaited<ReturnType<Domain["translate"]>>[] = [];

  try {
    if (debug) {
      targetOutputs.push(
        await domain.translate(target, {
          // return non-applicable template outputs
          onlyApplicable: false,
          //
          templateFieldInfo: true,
        })
      );
    } else {
      targetOutputs.push(
        await domain.translate(target, {
          // The core library currently returns mediawiki-compatible citation
          // metadata. We need this in the server to embed citation metadata
          // that Zotero and Citoid can understand. However, if we want to show
          // translation and expected outputs we need to have access to the raw
          // field outputs (i.e., not formatted as mediawiki citation)
          // See T306132, about having a format-agnostic Citation object; and
          // T302431, about updating output interfaces in w2c-core.
          templateFieldInfo: true,
        })
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      // fixme: we should treat differently 404 errors from target server
      // than from citoid api; see T304773
      if (error instanceof HTTPResponseError) {
        const response = error.response;
        res.status(response.status).send(
          `<h1>${req.t("error.external")}</h1>` +
            "<p>" +
            req.t("error.external.details", {
              url: error.url,
              code: response.status,
              message: response.statusText,
            }) +
            "</p>"
        );
        return;
      }
    }
    throw error;
  }

  const patternMap: Map<string, PatternResult> = new Map();
  const citations: CitationResult[] = [];

  for (const targetOutput of targetOutputs) {
    const pattern = targetOutput.translation.pattern;
    if (pattern === undefined) {
      // translation would have undefined pattern only if translate method was
      // called with "forceTemplatePaths" option
      console.warn(
        `Skipping forced-template translated target: ${targetOutput.target.path}`
      );
      continue;
    }
    if (!patternMap.has(pattern)) {
      const patternResult: PatternResult = {
        pattern: pattern,
        // todo: w2c-core should output pattern label
        label: undefined,
        targets: [],
      };
      patternMap.set(pattern, patternResult);
    }

    // todo: support multiple targets;
    // meanwhile, assuming all targets should have the same origin
    const origin = target.url.origin;
    const { targetResult, citations: targetCitations } = parseTargetOutput(
      targetOutput,
      origin
    );
    if (debug) {
      targetResult["debugJson"] = makeDebugJson(
        targetOutput,
        domain.patterns.currentRevid,
        domain.templates.currentRevid
      );
    }

    patternMap.get(pattern)!.targets.push(targetResult);
    citations.push(...targetCitations);
  }

  const patterns = Array.from(patternMap.values());

  if (citations.length === 0) {
    // fixes T305166
    res.status(404).send(req.t("error.noTranslation"));
    return;
  }

  const render = renderToStaticMarkup(
    ResultsPageWrapper({
      data: {
        domain: domain.domain,
        patterns,
        citations,
        // todo: we will have to change this when we support a base endpoint
        // controlled with query string parameters, see T305750
        debugHref: debug ? req.url : "/debug" + req.url,
        nodebugHref: debug ? req.url.replace("/debug", "") : req.url,
      },
      context: {
        t: req.t,
        storage: {
          // todo: the domain object should have a storage property (T306553)
          // assuming here all configuration objects have the same storage root and path
          instance: domain.templates.mediawiki.instance,
          wiki: domain.templates.mediawiki.wiki,
          prefix: domain.templates.storage.root,
          path: domain.templates.storage.path,
          filenames: {
            templates: domain.templates.storage.filename,
            patterns: domain.patterns.storage.filename,
            // tests: domain.tests.storage.filename,
            tests: "tests.json",
          },
        },
        schemas: {
          patterns: SCHEMAS_PATH + "patterns.schema.json",
          templates: SCHEMAS_PATH + "templates.schema.json",
          tests: SCHEMAS_PATH + "tests.schema.json",
        },
        debug: Boolean(debug),
      },
    })
  );
  res.send("<!DOCTYPE html>\n" + render);
}
// app.get("/debug/sandbox/:user/:url(*)", wrap(handler));
// app.get("/debug/:url(*)", wrap(handler));
// app.get("/sandbox/:user/:url(*)", wrap(handler));
// app.get("/:url(*)", wrap(handler));
app.get("/*", wrap(handler));

function parseTargetOutput(
  targetOutput: TranslationOutput,
  origin: string
): {
  targetResult: TargetResult;
  citations: CitationResult[];
} {
  const targetResult: TargetResult = {
    href: origin + targetOutput.target.path,
    path: targetOutput.target.path,
    results: [],
  };
  const citations: CitationResult[] = [];
  for (const templateOutput of targetOutput.translation.outputs) {
    if (templateOutput.template.applicable) {
      // citation should be defined for an applicable template
      const citation = templateOutput.citation!;
      const citationResult: CitationResult = {
        url: citation.url,
        data: getEmbeddableMetadata(citation),
      };
      citations.push(citationResult);
      targetResult.results.push(makeTranslationResult(templateOutput));
    }
  }
  return {
    targetResult,
    citations,
  };
}

function makeTranslationResult(
  templateOutput: TranslationOutput["translation"]["outputs"][number]
): TranslationResult {
  const translationResult: TranslationResult = {
    template: {
      path: templateOutput.template.path,
      // todo: w2c-core should output template label
      label: undefined,
    },
    fields: [],
  };
  const fields = templateOutput.template.fields ?? [];
  for (const field of fields) {
    if (field.valid) {
      translationResult.fields.push({
        name: field.name,
        output: field.output,
        test: undefined,
        score: undefined,
      });
    }
  }
  return translationResult;
}

function getEmbeddableMetadata(
  citation: NonNullable<
    TranslationOutput["translation"]["outputs"][number]["citation"]
  >
): CitationResult["data"] {
  const citationData: CitationResult["data"] = [];
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
      citationData.push({
        prefix,
        field,
        content,
      });
    });
  });
  return citationData;
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
