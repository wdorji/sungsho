console.log("Message from inject.js");
function highlightElement(element) {
  element.style.backgroundColor = "yellow";
}

function unhighlightElement(element) {
  element.style.backgroundColor = "";
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
  if (request.action === "convert") {
    function playAudioQueue(audioQueue) {
      if (audioQueue.length > 0) {
        const audioData = audioQueue.shift();
        const { text, parentElement, audio } = audioData;
        highlightElement(parentElement);
        audio.play();
        audio.addEventListener("ended", () => {
          unhighlightElement(parentElement);
          playAudioQueue(audioQueue);
        });
      }
    }
    function getAllTextNodes() {
      var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      var textNodes = [];
      cNode = walker.nextNode();

      function processNode(node) {
        if (node) {
          var parentElement = node.parentElement;
          var style = window.getComputedStyle(parentElement);

          if (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            parentElement.offsetParent !== null
          ) {
            var text = filterTibetanText(node.nodeValue.trim());
            if (text.length > 0) {
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

              query({ inputs: text }).then((response) => {
                console.log(text);
                const audioUrl = URL.createObjectURL(response);
                const audio = new Audio(audioUrl);
                textNodes.push({ text, parentElement, audio });
                processNode(walker.nextNode());
              });
            } else {
              processNode(walker.nextNode());
            }
          } else {
            processNode(walker.nextNode());
          }
        } else {
          chrome.runtime.sendMessage("", {
            type: "notification",
            options: {
              title: "Notification",
              message: "Processing complete!",
              iconUrl: "/icons/icon192.png",
              type: "basic",
            },
          });

          playAudioQueue(textNodes);
        }
      }

      processNode(cNode);

      return textNodes;
    }

    chrome.runtime.sendMessage("", {
      type: "notification",
      options: {
        title: "Notification",
        message: "Please wait a bit, processing page....",
        iconUrl: "/icons/icon192.png",
        type: "basic",
      },
    });
    getAllTextNodes();
  }
});
