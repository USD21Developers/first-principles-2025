function enableQuestionPopovers() {
  const question = getGlobalPhrase("question");
  const q1 = {
    title: `${question} 1`,
    text: document.querySelector(".question1Txt").innerText,
  };
  const q2 = {
    title: `${question} 2`,
    text: document.querySelector(".question2Txt").innerText,
  };
  const q3 = {
    title: `${question} 3`,
    text: document.querySelector(".question3Txt").innerText,
  };
  const q4 = {
    title: `${question} 4`,
    text: document.querySelector(".question4Txt").innerText,
  };
  const q5 = {
    title: `${question} 5`,
    text: document.querySelector(".question5Txt").innerText,
  };
  const q6 = {
    title: `${question} 6`,
    text: document.querySelector(".question6Txt").innerText,
  };

  document.querySelectorAll(".question1").forEach((item) => {
    item.setAttribute("data-bs-title", q1.title);
    item.setAttribute("data-bs-content", q1.text);
  });
  document.querySelectorAll(".question2").forEach((item) => {
    item.setAttribute("data-bs-title", q2.title);
    item.setAttribute("data-bs-content", q2.text);
  });
  document.querySelectorAll(".question3").forEach((item) => {
    item.setAttribute("data-bs-title", q3.title);
    item.setAttribute("data-bs-content", q3.text);
  });
  document.querySelectorAll(".question4").forEach((item) => {
    item.setAttribute("data-bs-title", q4.title);
    item.setAttribute("data-bs-content", q4.text);
  });
  document.querySelectorAll(".question5").forEach((item) => {
    item.setAttribute("data-bs-title", q5.title);
    item.setAttribute("data-bs-content", q5.text);
  });
  document.querySelectorAll(".question6").forEach((item) => {
    item.setAttribute("data-bs-title", q6.title);
    item.setAttribute("data-bs-content", q6.text);
  });

  const popoverTriggerList = document.querySelectorAll(
    '[data-bs-toggle="popover"]'
  );
  const popoverList = [...popoverTriggerList].map((popoverTriggerEl) => {
    new bootstrap.Popover(popoverTriggerEl);
  });

  document.querySelectorAll('[data-bs-toggle="popover"]').forEach((item) => {
    item.addEventListener("click", (evt) => evt.preventDefault());
  });
}

async function init() {
  await translate();
  enableQuestionPopovers();
  syncScriptures();

  shareLink();
  hideSpinner();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}
