import express from "express";
import { Domain, Webpage, fallbackTemplate } from "web2cit";

const app = express();
const port = process.env.PORT || 3000;

app.get("/:url(*)", (req, res) => {
  // handle wrong urls
  const url = new URL(req.params.url);
  const target = new Webpage(url.href);
  const domain = new Domain(
    target.domain,
    undefined,
    // fixme: change the order here
    fallbackTemplate
  );

  // consider having an init method
  domain.templates
    .getLatestRevision()
    .then((revision) => {
      if (revision !== undefined) {
        return domain.templates.loadConfiguration(revision.configuration);
      }
      return Promise.resolve();
    })
    // I don't like this
    // May be solved with the init method proposed above
    .then(() => {
      return domain.translate(target);
    })
    .then((output) => {
      // may be undefined!
      const citation = output.translation.outputs[0].citation;
      const metaTags: string[] = [];
      const items: string[] = [];
      (Object.keys(citation) as Array<keyof typeof citation>).forEach(
        (field) => {
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
            const item = `<li><b>${field}s:</b> ${content}</li>`;
            items.push(item);
          });
        }
      );
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
    });
});

app.listen(port, () => {
  console.log(`server is listening on ${port}!`);
});
