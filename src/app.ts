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
      // how do I change the URL interpreted by zotero? use a canonical?
      res.send(`
<!DOCTYPE html>
<head>
  <link rel="canonical" href="${citation.url}" />
  <meta property="og.title" content="${citation.title}">
</head>
<body>
  <h1>${citation.title}</h1>
</body>
        `);
    });
});

app.listen(port, () => {
  console.log(`server is listening on ${port}!`);
});
