function enableSpeech() {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel(); // kills anything still speaking or queued
  }

  const synth = window.speechSynthesis;
  let queue = [];
  let speaking = false;
  let paused = false;
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
          // skip elements with "inert"
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
    u.onend = () => {
      speaking = false;
      if (queue.length) {
        setTimeout(speakQueue, 0);
      } else {
        resetUI();
      }
    };
    synth.speak(u);
  }

  function startReading() {
    synth.cancel();
    const text = collectText(container);
    queue = chunkText(text);
    if (!queue.length) return;
    speakQueue();
    btnToggle.textContent = "⏸";
  }

  function resetUI() {
    speaking = false;
    paused = false;
    btnToggle.textContent = "▶️";
  }

  btnToggle.addEventListener("click", () => {
    if (!speaking && !paused) {
      startReading();
    } else if (speaking && !paused) {
      synth.pause();
      paused = true;
      btnToggle.textContent = "▶️";
    } else if (paused) {
      synth.resume();
      paused = false;
      btnToggle.textContent = "⏸";
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
}

init();
