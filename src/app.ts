import express, { RequestHandler } from "express";
import { Domain, Webpage } from "web2cit";
import i18next, { TFunction } from "i18next";
import i18nextMiddleware from "i18next-http-middleware";
import Backend from "i18next-fs-backend";
import { renderToStaticMarkup } from "react-dom/server";
import ResultsPageWrapper from "./components/ResultsPageWrapper";
import {
  PatternResult,
  TargetResult,
  TranslationResult,
  CitationResult,
  isReqQuery,
  ReqQuery,
} from "./types";
import { INVALID_PATH_ERROR_NAME } from "./errors";
import { TargetOutput } from "web2cit/dist/domain/domain";
import { makeDebugJson } from "./debug";
import HomePage from "./components/HomePage";
import {
  MediaWikiCitation,
  WebToCitCitation,
} from "web2cit/dist/citation/citationTypes";

type Citation = MediaWikiCitation | WebToCitCitation;

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
app.use(express.static("dist/public"));

app.get("/", (req, res) => {
  const render = renderToStaticMarkup(HomePage({ t: req.t }));
  res.send("<!DOCTYPE html>\n" + render);
});

type Options = {
  citoid: boolean;
  debug: boolean; // I don't think we have room for debug information in mediawiki format response
  format: "html" | "json" | "mediawiki";
  sandbox: string | undefined;
  tests: boolean; // no room for tests either in mediawiki format response
};

app.get(
  "/translate",
  wrap(async (req, res) => {
    if (!isReqQuery(req.query)) {
      res.status(400);
      // todo: consider providing more verbose output
      if (req.query.format === "json" || req.query.format === "mediawiki") {
        res.json({
          error: "Invalid query",
        });
      } else {
        res.send("Invalid query");
      }
      return;
    }

    const { citoid, debug, format, sandbox, tests } = req.query as ReqQuery;
    const { domain: domainName, path: targetPath } = req.query as ReqQuery;

    const options: Options = {
      citoid: citoid === "true" ? true : false,
      debug: debug === "true" ? true : false,
      format: format ?? "html",
      sandbox: sandbox || undefined,
      tests: tests === "true" ? true : false,
    };

    if (options.format === "mediawiki" && (options.debug || options.tests)) {
      res.status(400);
      res.json({
        error: '"mediawiki" format does not support debug or tests modes',
      });
      return;
    }

    if (options.format === "html" && options.tests && !options.citoid) {
      let path = "/";
      if (options.debug) path += "debug/";
      if (options.sandbox) path += `sandbox/${options.sandbox}/`;
      const url = "https://" + domainName + targetPath;
      path += url;
      res.redirect(301, path);
      return;
    }

    await handler(req, res, domainName, targetPath, options);
  })
);
app.get(
  "/*",
  wrap(async (req, res) => {
    const match = req.url.match(
      /^(?<debug>\/debug)?(?<sandbox>\/sandbox\/(?<user>[^/]+))?\/(?<url>.+)?$/
    );

    if (match === null) {
      res.redirect("/");
      return;
    }

    const debug =
      match.groups !== undefined && match.groups.debug !== undefined;

    let { user } = match.groups ?? {};
    // Fix T309321: handle user names with spaces
    user = user && decodeURI(user);

    let { url } = match.groups ?? {};
    url = url && decodeURIComponent(url);

    if (url === undefined) {
      res.status(400);
      res.send(req.t("error.noTarget"));
      return;
    }

    try {
      const { domain: domainName, path: targetPath } = new Webpage(url);
      await handler(req, res, domainName, targetPath, {
        citoid: false,
        debug,
        format: "html",
        sandbox: user,
        tests: true,
      });
    } catch {
      res.status(400);
      res.send(`${req.t("error.invalidTarget")}: ${url}`);
      return;
    }
  })
);

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
  res: Parameters<RequestHandler>[1],
  domainName: string,
  targetPath: string | undefined,
  options: Options
) {
  let domain: Domain;
  try {
    domain = new Domain(domainName);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400);
      const message = `${req.t("error.domain")}: ${error.message}`;
      if (options.format === "html") {
        res.send(message);
      } else {
        res.json({ error: message });
      }
      return;
    } else {
      throw error;
    }
  }

  // if target path unspecified, use all paths in template and test configs
  const targetPaths = targetPath ? [targetPath] : domain.getPaths();

  // ignore invalid target paths
  const validTargetPaths = targetPaths.reduce((valid: string[], targetPath) => {
    try {
      domain.webpages.getWebpage(targetPath);
      valid.push(targetPath);
    } catch {
      console.warn(`Could not create webpage object for path "${targetPath}`);
    }
    return valid;
  }, []);

  if (options.citoid) {
    for (const targetPath of validTargetPaths) {
      const target = domain.webpages.getWebpage(targetPath);
      // Make the citoid cache fetch its data
      // regardless of whether it is needed or not by one of the translation procedures.
      target.cache.citoid.getData();
    }
  }

  if (options.sandbox) {
    const user = options.sandbox;
    // todo: storage root should be given to the Domain constructor (T306553)
    let storageRoot = domain.templates.storage.root;
    storageRoot = `User:${user}/` + storageRoot;
    domain.templates.storage.root = storageRoot;
    domain.patterns.storage.root = storageRoot;
    domain.tests.storage.root = storageRoot;
  }

  // do not fetch configuration files if there are no valid target paths
  if (validTargetPaths.length > 0) {
    domain.fetchAndLoadConfigs(options.tests);
  }

  const targetOutputs = await domain.translate(targetPaths, {
    // if debug enabled, return non-applicable template outputs
    onlyApplicable: options.debug ? false : true,
  });

  const outputsByTarget: Map<string, TargetOutput> = new Map(
    targetOutputs.map((targetOutput) => [
      targetOutput.target.path,
      targetOutput,
    ])
  );

  const results: TargetResult[] = [];
  const citations: Citation[] = [];
  for (const targetPath of targetPaths) {
    const targetResult: TargetResult = {
      path: targetPath,
      results: [],
    };
    const targetCitations: typeof citations = [];

    if (targetPath in validTargetPaths) {
      const target = domain.webpages.getWebpage(targetPath);
      const targetOutput = outputsByTarget.get(targetPath)!;

      targetResult.pattern = targetOutput.translation.pattern;
      targetResult.error = targetOutput.translation.error;
      // if (error !== undefined) {
      //   // fixme: we should treat differently 404 errors from target server
      //   // than from citoid api; see T304773
      //   if (error instanceof HTTPResponseError) {
      //     const response = error.response;
      //     res.status(response.status);
      //     const message =
      //       `${req.t("error.external")} | ` +
      //       req.t("error.external.details", {
      //         url: error.url,
      //         code: response.status,
      //         message: response.statusText,
      //       });
      //     if (options.format === "html") {
      //       res.send(message);
      //     } else {
      //       res.json({ error: message });
      //     }
      //     return;
      //   }
      // }

      for (const templateOutput of targetOutput.translation.outputs) {
        if (templateOutput.template.applicable) {
          if (options.format !== "mediawiki") {
            // mediawiki format includes citations only
            // do not make translation results unnecessarily
            const translationResult = makeTranslationResult(templateOutput);
            targetResult.results.push(translationResult);
          }
          // citation should be defined for an applicable template
          const citation = templateOutput.citation!;
          targetCitations.push(citation);
        }
      }
      if (options.debug) {
        targetResult["debug"] = makeDebugJson(
          targetOutput,
          domain.patterns.currentRevid ?? 0,
          domain.templates.currentRevid ?? 0,
          options.tests ? domain.tests.currentRevid ?? 0 : undefined
        );
      }

      if (options.citoid) {
        // todo: add the corresponding translation result too
        // targetResult.results.push({})
        const citation = (await target.cache.citoid.getData()).citation;
        targetCitations.push(citation.mediawiki);
      }
    } else {
      targetResult.error = {
        name: INVALID_PATH_ERROR_NAME,
        message: `"${targetPath} is not a valid path for domain "${domain.domain}`,
      };
    }

    results.push(targetResult);
    citations.push(...targetCitations);
  }

  if (options.format === "html") {
    if (citations.length === 0) {
      // fixes T305166
      res.status(404);
      res.send(req.t("error.noTranslation"));
      return;
    }
    const query: ReqQuery = {
      citoid: options.citoid ? "true" : "false",
      debug: options.debug ? "true" : "false",
      format: "html",
      tests: options.tests ? "true" : "false",
      domain: domainName,
      path: targetPath,
    };
    if (options.sandbox !== undefined) query.sandbox = options.sandbox;

    const html = makeHtmlResponse(
      results,
      citations,
      options.debug,
      query,
      domain,
      req.t
    );
    res.send(html);
  } else if (options.format === "mediawiki") {
    res.json(citations as Citation[]);
  } else if (options.format === "json") {
    // make error objects stringify-able
    const json = JSON.parse(
      JSON.stringify(results, (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
          };
        }
      })
    );
    res.json(json);
  }
}

function makeTranslationResult(
  templateOutput: TargetOutput["translation"]["outputs"][number]
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

function getEmbeddableMetadata(citation: Citation): CitationResult["data"] {
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

function makeHtmlResponse(
  targetResults: TargetResult[],
  citations: Array<Parameters<typeof getEmbeddableMetadata>[0]>,
  debug: boolean,
  query: ReqQuery,
  domain: Domain,
  t: TFunction
): string {
  // pattern may be undefined if:
  // * target translated with forced templates, or
  // * target path is invalid
  const patternMap: Map<string | undefined, PatternResult> = new Map();
  for (const targetResult of targetResults) {
    const pattern = targetResult.pattern;

    if (!patternMap.has(pattern)) {
      const patternResult: PatternResult = {
        pattern: pattern,
        // todo: w2c-core should output pattern label
        label: undefined,
        targets: [],
      };
      patternMap.set(pattern, patternResult);
    }
    patternMap.get(pattern)!.targets.push(targetResult);
  }
  const patterns = Array.from(patternMap.values());

  const citationResults: CitationResult[] = citations.map((citation) => {
    const citationResult: CitationResult = {
      url: citation.url,
      data: getEmbeddableMetadata(citation),
    };
    return citationResult;
  });

  const render = renderToStaticMarkup(
    ResultsPageWrapper({
      data: {
        domain: domain.domain,
        patterns,
        citations: citationResults,
      },
      context: {
        t,
        query,
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
        debug,
        schemas: {
          patterns: SCHEMAS_PATH + "patterns.schema.json",
          templates: SCHEMAS_PATH + "templates.schema.json",
          tests: SCHEMAS_PATH + "tests.schema.json",
        },
      },
    })
  );
  return "<!DOCTYPE html>\n" + render;
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
