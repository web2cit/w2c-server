import express from "express";
import * as W2C from "web2cit";
// import { Domain } from 'web2cit';

const app = express();
const port = 3000;
app.get("/", (req, res) => {
  res.send("The sedulous hyena ate the antelope!");
});
app.listen(port, () => {
  // if (err) {
  //   return console.error(err);
  // }
  const myDomain = new W2C.Domain("test");
  console.log(`Domain object for "${myDomain.domain}" successfully created!"`);
  return console.log(`server is listening on ${port}!`);
});
