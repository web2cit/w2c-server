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
      res.send(output);
    });
});

app.listen(port, () => {
  console.log(`server is listening on ${port}!`);
});
