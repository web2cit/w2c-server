// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initHome() {
  const form = document.querySelector("form");
  if (form === null) {
    throw new Error("Could not find form element");
  }

  const urlInput = document.querySelector("input#url") as HTMLInputElement;
  if (urlInput === null) {
    throw new Error("Could not find url input element");
  }

  const configSelect = document.querySelector(
    "select#config"
  ) as HTMLSelectElement;
  if (configSelect === null) {
    throw new Error("Could not find config select element");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const url = data.get("url");
    if (url === null || typeof url !== "string") {
      throw new Error('Could not find string field "url"');
    }
    if (url === "") {
      throw new Error("Invalid empty URL string");
    }

    const config = data.get("config");
    if (config === null || typeof config !== "string") {
      throw new Error('Could not find string field "config"');
    }
    if (config !== "main" && config !== "sandbox") {
      throw new Error("Invalid config value: " + config);
    }

    let user;
    if (config === "sandbox") {
      user = data.get("user");
      if (user === null || typeof user !== "string") {
        throw new Error('Could not find string field "user"');
      }
      if (user === "") {
        throw new Error("Invalid empty user string");
      }
    }

    const debug = data.get("debug") === "on";

    let path = "";
    if (debug) path += "/debug";
    if (user) path += `/sandbox/${user}`;
    window.location.pathname = path + "/" + url;
  });

  function urlInputEventHandler(e: Event) {
    const submit = document.querySelector("input#submit") as HTMLInputElement;
    if (submit === null) {
      throw new Error("Could not find submit button");
    }
    const input = e.target as HTMLInputElement;
    const url = input.value;
    if (url === "") {
      submit.disabled = true;
    } else {
      submit.disabled = false;
    }
  }

  urlInput.addEventListener("change", urlInputEventHandler);
  urlInput.addEventListener("input", urlInputEventHandler);

  configSelect.addEventListener("change", (e: Event) => {
    const user = document.querySelector("input#user") as HTMLInputElement;
    if (user === null) {
      throw new Error("Could not find user input element");
    }
    const select = e.target as HTMLSelectElement;
    const config = select.value;
    if (config === "main") {
      user.disabled = true;
    } else if (config === "sandbox") {
      user.disabled = false;
    }
  });
}
