function enableSpeech() {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    document
      .querySelector(".speechSynthesisPlayer")
      ?.classList.remove("d-none");
  }

  const synth = window.speechSynthesis;
  let queue = [];
  let speaking = false;
  let paused = false;
  let fullText = "";
  let currentIndex = 0;
  let currentUtterance = null;

  const btnToggle = document.getElementById("toggle");
  const btnStop = document.getElementById("stop");
  const container = document.getElementById("content");

  // collect text excluding inert elements
  function collectText(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.hasAttribute("inert")
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    let text = "";
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue.trim();
        if (val) text += val + " ";
      }
    }
    return text.trim();
  }

  function chunkText(text, maxLen = 400) {
    const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]|\S+$/g) || [
      text,
    ];
    const chunks = [];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length <= maxLen) {
        buf += s + " ";
      } else {
        if (buf) chunks.push(buf.trim());
        if (s.length > maxLen) {
          for (let i = 0; i < s.length; i += maxLen) {
            chunks.push(s.slice(i, i + maxLen));
          }
          buf = "";
        } else {
          buf = s + " ";
        }
      }
    }
    if (buf) chunks.push(buf.trim());
    return chunks;
  }

  function speakQueue() {
    if (speaking || !queue.length) return;
    speaking = true;
    const text = queue.shift();
    const u = new SpeechSynthesisUtterance(text);
    currentUtterance = u;

    // track how far we’ve read
    u.onboundary = (event) => {
      if (event.name === "word") {
        currentIndex += event.charIndex;
      }
    };

    u.onend = () => {
      speaking = false;
      if (queue.length && !paused) {
        setTimeout(speakQueue, 0);
      } else if (!paused) {
        resetUI();
      }
    };
    synth.speak(u);
  }

  function startReading() {
    synth.cancel();
    fullText = collectText(container);
    currentIndex = 0;
    queue = chunkText(fullText);
    if (!queue.length) return;
    speakQueue();
    btnToggle
      .querySelector("img")
      .setAttribute("src", "../_assets/img/icons/pause-circle.svg");
    btnStop.classList.remove("d-none");
  }

  function resetUI() {
    speaking = false;
    paused = false;
    btnToggle
      .querySelector("img")
      .setAttribute("src", "../_assets/img/icons/play-circle.svg");
    btnStop.classList.add("d-none");
  }

  btnToggle.addEventListener("click", () => {
    if (!speaking && !paused) {
      // fresh start
      startReading();
      btnStop.classList.remove("d-none");
    } else if (speaking && !paused) {
      // simulate pause by canceling
      synth.cancel();
      paused = true;
      btnToggle
        .querySelector("img")
        .setAttribute("src", "../_assets/img/icons/play-circle.svg");
    } else if (paused) {
      // resume by restarting at currentIndex
      const remainingText = fullText.slice(currentIndex);
      queue = chunkText(remainingText);
      paused = false;
      speakQueue();
      btnToggle
        .querySelector("img")
        .setAttribute("src", "../_assets/img/icons/pause-circle.svg");
    }
  });

  btnStop.addEventListener("click", () => {
    synth.cancel();
    queue = [];
    resetUI();
  });
}

async function init() {
  await translate();
  await syncScriptures();
  shareLink();
  enableSpeech();
  hideSpinner();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}
