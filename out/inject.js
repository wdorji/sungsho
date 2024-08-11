function highlightElement(element, text, index) {
  var innerHTML = element.innerHTML;

  if (index >= 0) {
    innerHTML =
      innerHTML.substring(0, index) +
      "<span style='background-color: #5DE9FF;'>" +
      innerHTML.substring(index, index + text.length) +
      "</span>" +
      innerHTML.substring(index + text.length);
    element.innerHTML = innerHTML;

    return index;
  }
}

function unhighlightElement(element, parentText) {
  element.innerHTML = parentText;
}

function containsTibetanAlphabet(text) {
  // Regular expression to match Tibetan alphabet characters
  var tibetanAlphabetRegex = /[\u0F40-\u0FBC]/;
  return tibetanAlphabetRegex.test(text);
}

function filterTibetanText(txt) {
  // Regular expression to match Tibetan characters
  const tibetanRegex = /[\u0F00-\u0FFF]/g;

  // Filter the Tibetan characters from the input text
  const tibetanCharacters = txt.match(tibetanRegex);

  // Return the filtered Tibetan characters as a string
  return tibetanCharacters ? tibetanCharacters.join("") : "";
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  async function query(data) {
    const response = await fetch(
      request.dzo
        ? "https://api-inference.huggingface.co/models/facebook/mms-tts-dzo"
        : "https://api-inference.huggingface.co/models/facebook/mms-tts-bod",
      {
        headers: {
          Authorization: "Bearer " + request.token,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    const result = await response.blob();
    return result;
  }

  if (request.action === "convert") {
    function getAllTextNodes() {
      return new Promise((resolve, reject) => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        const textNodes = [];
        let cNode = walker.nextNode();

        function processNode(node) {
          return new Promise((resolve, reject) => {
            if (node) {
              const parentElement = node.parentElement;
              const style = window.getComputedStyle(parentElement);

              if (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                parentElement.offsetParent !== null
              ) {
                const text = node.nodeValue.trim();
                if (text.length > 0) {
                  const raw = text.split(/[\s\u0F0D\u0F14]+/);

                  raw.forEach(filterTibetanText);

                  const sentences = raw.filter(containsTibetanAlphabet);

                  if (sentences.length === 0) {
                    // Process the next node
                    cNode = walker.nextNode();
                    processNode(cNode).then(resolve).catch(reject);
                  } else {
                    const parentInnerHTML = parentElement.innerHTML;

                    let currentIndex = 0;

                    // Process each sentence
                    Promise.all(
                      sentences.map(async (sentence, index) => {
                        try {
                          // Store the sentence and parent element
                          // nthIndex(parentInnerText, se)
                          const sentenceIndex = parentInnerHTML.indexOf(
                            sentence,
                            currentIndex
                          );

                          currentIndex = sentenceIndex + sentence.length;

                          // highlightElement(
                          //   parentElement,
                          //   sentence,
                          //   sentenceIndex
                          // );
                          textNodes.push({
                            sentence,
                            parentElement,
                            parentInnerHTML,
                            sentenceIndex,
                          });
                          // unhighlightElement(parentElement, parentInnerHTML);

                          // Return true if it's the last sentence
                          return index === sentences.length - 1;
                        } catch (error) {
                          // console.error(
                          //   `Error processing sentence ${index}:`,
                          //   error
                          // );
                          return false;
                        }
                      })
                    )
                      .then((results) => {
                        if (results.includes(true)) {
                          // Move to the next node
                          cNode = walker.nextNode();
                          processNode(cNode).then(resolve).catch(reject);
                        } else {
                          resolve(textNodes);
                        }
                      })
                      .catch(reject);
                  }
                } else {
                  // Move to the next node
                  cNode = walker.nextNode();
                  processNode(cNode).then(resolve).catch(reject);
                }
              } else {
                // Move to the next node
                cNode = walker.nextNode();
                processNode(cNode).then(resolve).catch(reject);
              }
            } else {
              resolve(textNodes);
            }
          });
        }

        resolve(processNode(cNode));
      });
    }

    let currentPromise = Promise.resolve();

    function playAudio(processedAudio, element) {
      return new Promise((resolve, reject) => {
        highlightElement(
          element.parentElement,
          element.sentence,
          element.sentenceIndex
        );
        processedAudio.play();
        processedAudio.addEventListener("ended", () => {
          unhighlightElement(element.parentElement, element.parentInnerHTML);
          resolve("finito");
        });
      });
    }

    async function processSentences(sentences) {
      for (const element of sentences) {
        const response = await query({
          inputs: element.sentence,
          options: { wait_for_model: true },
        });

        const audioUrl = URL.createObjectURL(response);
        const audio = new Audio(audioUrl);
        // console.log(element.sentence);

        currentPromise = currentPromise.then(() => playAudio(audio, element));
        // audio.playAudio();
      }
    }

    async function asyncCall() {
      // console.log("calling");
      const result = await getAllTextNodes();

      // console.log(result);

      processSentences(result);

      // console.log("ending");
      // Expected output: "resolved"
    }

    asyncCall();

    chrome.runtime.sendMessage("", {
      type: "notification",
      options: {
        title: "Notification",
        message: "Please wait a bit, processing page....",
        iconUrl: "/icons/icon192.png",
        type: "basic",
      },
    });
  }
});
