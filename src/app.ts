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
  JsonResponse,
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

const API_VERSION = process.env.npm_package_version ?? "";

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
        const response: JsonResponse = {
          info: {
            apiVersion: API_VERSION,
          },
          error: {
            name: "Invalid query",
            message: `"${req.query}" is not a valid query`,
          },
        };
        res.json(response);
      } else {
        res.send("Invalid query");
      }
      return;
    }

    const {
      citoid,
      debug,
      format,
      sandbox,
      tests,
      path: targetPath,
    } = req.query as ReqQuery;

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

    if (
      options.format === "html" &&
      options.tests &&
      !options.citoid &&
      (req.query.url || (targetPath && targetPath[0] === "/"))
    ) {
      let path = "/";
      if (options.debug) path += "debug/";
      if (options.sandbox) path += `sandbox/${options.sandbox}/`;
      path += req.query.url ?? "https://" + req.query.domain + targetPath;
      res.redirect(301, path);
      return;
    }

    if (req.query.domain !== undefined) {
      await handler(req, res, req.query.domain, targetPath, options);
    } else {
      await urlHandler(req, res, req.query.url, options);
    }
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

    await urlHandler(req, res, url, {
      citoid: false,
      debug,
      format: "html",
      sandbox: user,
      tests: true,
    });
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

async function urlHandler(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  url: string,
  options: Options
) {
  let domainName, targetPath;
  try {
    const target = new Webpage(url);
    domainName = target.domain;
    targetPath = target.path;
  } catch {
    const message = `${req.t("error.invalidTarget")}: ${url}`;
    res.status(400);
    if (options.format === "json") {
      const response: JsonResponse = {
        info: { apiVersion: API_VERSION },
        error: {
          name: "Invalid target",
          message,
        },
      };
      res.json(response);
    } else {
      res.send(message);
    }
    return;
  }
  await handler(req, res, domainName, targetPath, options);
}

async function handler(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  domainName: string,
  targetPath: string | undefined,
  options: Options
) {
  // initialize json response
  const jsonResponse: JsonResponse = {
    info: {
      apiVersion: API_VERSION,
    },
  };

  const userAgentPrefix =
    "web2cit-server/" +
    API_VERSION +
    " (https://phabricator.wikimedia.org/tag/web2cit-server/)";
  let domain: Domain;
  try {
    domain = new Domain(domainName, {
      userAgentPrefix,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400);
      const message = `${req.t("error.domain")}: ${error.message}`;
      if (options.format === "html") {
        res.send(message);
      } else {
        jsonResponse.error = {
          name: "Invalid domain",
          message: message,
        };
        res.json(jsonResponse);
      }
      return;
    } else {
      throw error;
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

  let configsFetched = false;
  let targetPaths;
  if (targetPath === undefined) {
    // if target path unspecified, use all paths in template and test configs
    await domain.fetchAndLoadConfigs(options.tests);
    configsFetched = true;
    targetPaths = domain.getPaths();
  } else {
    targetPaths = [targetPath];
  }

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

  if (!configsFetched && validTargetPaths.length) {
    await domain.fetchAndLoadConfigs();
    configsFetched = true;
  }

  if (configsFetched) {
    // update json response
    jsonResponse.info.config = {
      patterns: {
        path: domain.patterns.title,
        revid: domain.patterns.currentRevid,
      },
      templates: {
        path: domain.templates.title,
        revid: domain.templates.currentRevid,
      },
      tests: options.tests
        ? {
            path: domain.tests.title,
            revid: domain.tests.currentRevid,
          }
        : undefined,
    };
  }

  if (targetPaths.length === 0) {
    const message = req.t("error.noTargetPaths");
    res.status(404);
    if (options.format === "json") {
      jsonResponse.data = {
        targets: [],
        score: undefined,
      };
      jsonResponse.error = {
        name: "No targets",
        message,
      };
      res.json(jsonResponse);
    } else {
      res.send(message);
    }
    return;
  }

  if (options.citoid) {
    for (const targetPath of validTargetPaths) {
      const target = domain.webpages.getWebpage(targetPath);
      // Make the citoid cache fetch its data
      // regardless of whether it is needed or not by one of the translation procedures.
      target.cache.citoid.getData();
    }
  }

  const targetOutputs = await domain.translate(validTargetPaths, {
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
      score: undefined,
    };
    const targetCitations: typeof citations = [];

    if (validTargetPaths.includes(targetPath)) {
      const target = domain.webpages.getWebpage(targetPath);
      // use target.path because targetPath may have been changed by
      // the Webpage constructor; e.g., "\h/" -> "/h/"
      const targetOutput = outputsByTarget.get(target.path)!;

      targetResult.path = target.path; // update the path in the target result
      targetResult.href = target.url.href;
      targetResult.pattern = targetOutput.translation.pattern;
      targetResult.error = targetOutput.translation.error;

      // if applicable, push Citoid citation before Web2Cit citations
      if (options.citoid) {
        // todo: add the corresponding translation result too
        // targetResult.results.push({})
        try {
          const citation = (await target.cache.citoid.getData()).citation;
          targetCitations.push(citation.mediawiki);
        } catch {
          console.warn(
            `Could not get Citoid citation for path "${target.path}"`
          );
        }
      }

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

      // use score of first applicable result as target score
      targetResult.score = targetResult.results[0]?.score;

      if (options.debug) {
        targetResult["debug"] = makeDebugJson(
          targetOutput,
          domain.patterns.currentRevid ?? 0,
          domain.templates.currentRevid ?? 0,
          options.tests ? domain.tests.currentRevid ?? 0 : undefined
        );
      }
    } else {
      targetResult.error = {
        name: INVALID_PATH_ERROR_NAME,
        message: `"${targetPath}" is not a valid path for domain "${domain.domain}"`,
      };
    }

    results.push(targetResult);
    citations.push(...targetCitations);
  }

  if (citations.length === 0) {
    // fixes T305166
    res.status(404);
    // res.send(req.t("error.noTranslation"));
    // return;
  }

  if (options.format === "html") {
    const query: ReqQuery = {
      citoid: options.citoid ? "true" : "false",
      debug: options.debug ? "true" : "false",
      format: "html",
      tests: options.tests ? "true" : "false",
      domain: domainName,
    };
    if (targetPath !== undefined) query.path = targetPath;
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
    let score;
    if (options.tests) {
      let scoreCount = 0;
      let scoreSum = 0;
      results.forEach((result) => {
        const score = result.score;
        if (score !== undefined) {
          scoreCount += 1;
          scoreSum += score;
        }
      });
      if (scoreCount > 0) {
        score = scoreSum / scoreCount;
      }
    }

    // make error objects stringify-able
    const targets: TargetResult[] = JSON.parse(
      JSON.stringify(results, (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
          };
        } else {
          return value;
        }
      })
    );

    jsonResponse.data = {
      targets,
      score,
    };
    res.json(jsonResponse);
  }
}

function makeTranslationResult(
  templateOutput: TargetOutput["translation"]["outputs"][number]
): TranslationResult {
  const fields: TranslationResult["fields"] = [];
  let scoreCount = 0;
  let scoreSum = 0;
  const fieldNames = Array.from(
    new Set([
      // valid fields from template output
      ...templateOutput.template.fields
        .filter((field) => field.valid)
        .map((field) => field.name),
      // test fields
      ...templateOutput.scores.fields.map((field) => field.fieldname),
    ])
  );
  for (const fieldName of fieldNames) {
    const outputField = templateOutput.template.fields.filter(
      (field) => field.name === fieldName
    )[0];
    const testField = templateOutput.scores.fields.filter(
      (field) => field.fieldname === fieldName
    )[0];

    const score = testField && testField.score;
    if (score !== undefined) {
      scoreCount += 1;
      scoreSum += score;
    }

    fields.push({
      name: fieldName,
      // undefined field output equals empty output (T313757)
      output: outputField?.output ?? [],
      test: testField && testField.goal,
      score,
    });
  }
  const translationResult: TranslationResult = {
    template: {
      path: templateOutput.template.path,
      // todo: w2c-core should output template label
      label: undefined,
    },
    fields,
    // todo: w2c-core should output result's average score
    score: scoreCount > 0 ? scoreSum / scoreCount : undefined,
  };

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
