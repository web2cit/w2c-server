// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initResults() {
  const switchButton = document.querySelector("input#switch") as HTMLInputElement;
  function userInputEventHandler(e: Event) {
    const input = e.target as HTMLInputElement;
    const user = input.value;
    if (user === "") {
      switchButton.disabled = true;
    } else {
      switchButton.disabled = false;
    }
  }
  if (switchButton.className === "sandbox") {
    switchButton.disabled = true;
    const userInput = document.querySelector("input#user") as HTMLInputElement;
    userInput.addEventListener("change", userInputEventHandler);
    userInput.addEventListener("input", userInputEventHandler);
  } 
}
