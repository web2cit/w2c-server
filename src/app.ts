import express, { NextFunction, RequestHandler } from "express";
import { Domain, Webpage, fallbackTemplate, HTTPResponseError } from "web2cit";

const app = express();
const port = process.env.PORT || 3000;

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

app.get(
  "/:url(*)",
  wrap(async (req, res) => {
    let target;
    try {
      target = new Webpage(req.params.url);
    } catch {
      res.status(400).send("Invalid target URL");
      return;
    }
    const url = target.url;

    let domain;
    try {
      domain = new Domain(
        target.domain,
        undefined,
        // fixme: change the order here
        fallbackTemplate
      );
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

    // consider having an init method
    const revision = await domain.templates.getLatestRevision();
    if (revision !== undefined) {
      domain.templates.loadConfiguration(revision.configuration);
    }

    let output;
    try {
      output = await domain.translate(target);
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

    // fixme: may be undefined!
    const citation = output.translation.outputs[0].citation;
    const metaTags: string[] = [];
    const items: string[] = [];
    (Object.keys(citation) as Array<keyof typeof citation>).forEach((field) => {
      if (field === "key" || field === "version") return;

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
        const tag = `<meta property="${prefix}:${field}" content="${content}"/>`;
        metaTags.push(tag);
        const item = `<li><b>${field}:</b> ${content}</li>`;
        items.push(item);
      });
    });

    // fixme: publisher mapped to multiple fields ends in extra
    // fixme: source ends in extra. what does zotero use it for?
    res.send(`
<!DOCTYPE html>
<html
  xmlns="http://www.w3.org/1999/xhtml"
  prefix="z:http://www.zotero.org/namespaces/export#"
>
<head>
  <link rel="canonical" href="${citation.url}" />
  ${metaTags.join("")}
</head>
<body>
  <p>Web2Cit translation for ${url}:</p>
  <ul>
  ${items.join("")}
  </ul>
</body>
</html>
  `);
  })
);

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
