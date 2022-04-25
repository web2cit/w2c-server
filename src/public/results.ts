const switchToMain = function () {
  const path = window.location.pathname;
  const newPath = path.replace(/^(\/(debug\/)?)sandbox\/.*?\//, "$1");
  window.location.pathname = newPath;
};

function switchToSandbox() {
  const path = window.location.pathname;
  const userInput = document.querySelector("input#user") as HTMLInputElement;
  const user = userInput.value;
  if (user) {
    const newPath = path.replace(/^(\/debug)?/, "$1/sandbox/" + user);
    window.location.pathname = newPath;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setSwitch() {
  const switchAnchor = document.querySelector("a#switch") as HTMLAnchorElement;
  function userInputEventHandler(e: Event) {
    const input = e.target as HTMLInputElement;
    const user = input.value;
    if (user === "") {
      switchAnchor.className = "sandbox disabled";
    } else {
      switchAnchor.className = "sandbox";
    }
  }
  if (switchAnchor.className === "main") {
    switchAnchor.addEventListener("click", (e) => {
      e.preventDefault();
      switchToMain();
    });
  } else if (switchAnchor.className === "sandbox") {
    switchAnchor.addEventListener("click", (e) => {
      e.preventDefault();
      switchToSandbox();
    });
    switchAnchor.className = "sandbox disabled";
    const userInput = document.querySelector("input#user") as HTMLInputElement;
    userInput.addEventListener("change", userInputEventHandler);
    userInput.addEventListener("input", userInputEventHandler);
  }
}
