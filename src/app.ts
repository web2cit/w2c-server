import express, { RequestHandler } from "express";
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

async function handler(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1]
) {
  const debug = req.path.split("/")[1] === "debug";

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

  if (req.params.user) {
    // todo: storage root should be given to the Domain constructor
    domain.templates.storage.root = `User:${req.params.user}/Web2Cit/data/`;
    domain.patterns.storage.root = `User:${req.params.user}/Web2Cit/data/`;
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

  const metaTags: string[] = [];
  const items: string[] = [];
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
      const htmlContent = htmlEncode(content);
      const tag = `<meta property="${prefix}:${field}" content="${htmlContent}"/>`;
      metaTags.push(tag);
      const item = `<li><b>${field}:</b> ${htmlContent}</li>`;
      items.push(item);
    });
  });

  // create debug output
  let debugHtml = "";
  if (debug) {
    debugHtml = makeDebugHtml(
      output.translation,
      domain.patterns.currentRevid,
      domain.templates.currentRevid
    );
  }

  // todo: domain configuration object should have a shortcut for this
  const templatesPath =
    domain.templates.mediawiki.instance +
    domain.templates.mediawiki.wiki +
    domain.templates.storage.root +
    domain.templates.storage.path +
    domain.templates.storage.filename;
  const patternsPath =
    domain.patterns.mediawiki.instance +
    domain.patterns.mediawiki.wiki +
    domain.patterns.storage.root +
    domain.patterns.storage.path +
    domain.patterns.storage.filename;

  // fixme: publisher mapped to multiple fields ends in extra
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
  <p>Web2Cit translation for ${url}</p>
  <ul>
  ${items.join("")}
  </ul>
  <p>Templates configuration: <a href="${templatesPath}">${templatesPath}</a></p>
  <p>Patterns configuration: <a href="${patternsPath}">${patternsPath}</a></p>
  ${debugHtml}
</body>
</html>
  `);
}
// may not be the best approach
// alternatively, we may use a debug subdomain, but toolforge tools don't seem to support subdomains
// we may use query string parameters, but that would mean passing the url as parameter
// and we would need to escape it
app.get("/debug/sandbox/:user/:url(*)", wrap(handler));

app.get("/debug/:url(*)", wrap(handler));

app.get("/sandbox/:user/:url(*)", wrap(handler));

app.get("/:url(*)", wrap(handler));

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

function makeDebugHtml(
  translation: Awaited<ReturnType<Domain["translate"]>>["translation"],
  patternsRevid: number | undefined,
  templatesRevid: number | undefined
): string {
  // todo: w2c-core's TranslationOutput pattern may be undefined if catch-all
  const pattern = translation.pattern;
  // todo: w2c-core's TranslationOutput may include pattern label
  const templates = translation.outputs
    .map((output) => makeTemplateHtml(output.template))
    .join("");

  const html = `
    <h2>Debugging information</h2>
    <ul>
      <li>patterns.json: ${
        patternsRevid ? `revid ${patternsRevid}` : "not found or corrupt"
      }
        <ul>
          <li>URL path pattern group: ${pattern}</li>
        </ul>
      </li>
      <li>templates.json: ${
        templatesRevid ? `revid ${templatesRevid}` : "not found or corrupt"
      }
        <ol>
          ${templates}
        </ol>
      </li>
    </ul>
  `;
  return html;
}

function makeTemplateHtml(
  template: Parameters<typeof makeDebugHtml>[0]["outputs"][number]["template"]
): string {
  const path = template.path;
  // todo: w2c-core's TranslationOutput may include template label
  // const label = output.template.label;
  const applicable = template.applicable;
  if (template.fields === undefined) {
    throw new Error(
      "Unexpected undefined fields property in debug translation output"
    );
  }
  const fields = template.fields.map((field) => makeFieldHtml(field)).join("");

  return `
    <li>Template: ${path}
      <ul>
        <li>applicable: ${applicable}</li>
        <li>fields:
          <ul>
            ${fields}
          </ul>
        </li>
      </ul>
    </li>
  `;
}

function makeFieldHtml(
  field: NonNullable<Parameters<typeof makeTemplateHtml>[0]["fields"]>[number]
): string {
  const fieldname = field.name;
  const required = field.required;
  // todo: w2c-core's FieldInfo may include field pattern
  // do we need isArray too?
  // const pattern = field.pattern;

  // todo: w2c-core's FieldInfo should include field output validity
  const valid = Boolean(
    field.output.length && field.output.every((value) => value !== null)
  );
  const applicable = field.applicable;

  // todo: w2c-core's FieldInfo should include combined procedure output as output
  const output = field.procedures.reduce((html: string, procedure) => {
    html += procedure.output.map((value) => `<li>${value}</li>`).join();
    return html;
  }, "");
  const procedures = field.procedures
    .map((procedure, index) => makeProcedureHtml(procedure, index))
    .join("");

  return `
    <li>${fieldname} field
      <ul>
        <li>required: ${required}</li>
        <li>procedures:
          <ol>
            ${procedures}
          </ol>
        </li>
        <li>output:
          <ol>
            ${output}
          </ol>
        </li>
        <li>pattern: see <a href="https://meta.wikimedia.org/wiki/Web2Cit/Early_adopters#Translation_field_types">early adopter guidelines</a></li>
        <li>valid: ${valid}</li>
        <li>applicable: ${applicable}</li>
      </ul>
    </li>
  `;
}

function makeProcedureHtml(
  procedure: Parameters<typeof makeFieldHtml>[0]["procedures"][number],
  index: number
): string {
  const output = procedure.output.reduce((html: string, value) => {
    html += `<li>${value}</li>`;
    return html;
  }, "");
  const selections = procedure.selections
    .map((selection) => makeSelectionHtml(selection))
    .join("");
  // todo: w2c-core's FieldInfo may have an overall selection output
  const selectionOutput = procedure.selections.reduce(
    (html: string, selection) => {
      html += selection.output.map((value) => `<li>${value}</li>`).join();
      return html;
    },
    ""
  );
  const transformations = procedure.transformations
    .map((transformation) => makeTransformationHtml(transformation))
    .join("");
  // todo: w2c-core's FieldInfo may have an overall transformation output
  const transformationOutput = output;

  return `
    <li>Procedure ${index + 1}
      <ul>
        <li>Selection
          <ul>
            <li>Selection steps:
              <ol>
                ${selections}
              </ol>
            </li>
            <li>Selection output:
              <ol>
                ${selectionOutput}
              </ol>
            </li>
          </ul>
        </li>
        <li>Transformation
          <ul>
            <li>Transformation steps:
              <ol>
                ${transformations}
              </ol>
            </li>
            <li>Transformation output:
              <ol>
                ${transformationOutput}
              </ol>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  `;
}

function makeSelectionHtml(
  selection: Parameters<typeof makeProcedureHtml>[0]["selections"][number]
): string {
  const type = selection.type;
  const config = selection.config;
  const output = selection.output.reduce((html: string, value) => {
    html += `<li>${value}</li>`;
    return html;
  }, "");
  return `
    <li>${type} selection
      <ul>
        <li>config: ${config}</li>
        <li>output:
          <ol>
            ${output}
          </ol>
        </li>
      </ul>
    </li>
  `;
}

function makeTransformationHtml(
  transformation: Parameters<
    typeof makeProcedureHtml
  >[0]["transformations"][number]
): string {
  const type = transformation.type;
  const config = transformation.config;
  const itemwise = transformation.itemwise;
  const output = transformation.output.reduce((html: string, value) => {
    html += `<li>${value}</li>`;
    return html;
  }, "");
  return `
    <li>${type} transformation
      <ul>
        <li>config: ${config}</li>
        <li>itemwise: ${itemwise}</li>
        <li>output:
          <ol>
            ${output}
          </ol>
        </li>
      </ul>
    </li>
  `;
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
