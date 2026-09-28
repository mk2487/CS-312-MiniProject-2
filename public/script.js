const form = document.getElementById("converter-form");
const from = document.getElementById("from");
const to = document.getElementById("to");
const button = document.getElementById("convert-button");

document.getElementById("swap").addEventListener("click", () => {
    [from.value, to.value] = [to.value, from.value];
});
form.addEventListener("submit", () => {
    button.disabled = true;
    button.textContent = "Converting...";
});
window.addEventListener("pageshow", () => {
    button.disabled = false;
    button.textContent = "Convert";
});
