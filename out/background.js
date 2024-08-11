chrome.runtime.onStartup.addListener(() => {
  console.log(`onStartup()`);
});

chrome.runtime.onMessage.addListener((data) => {
  if (data.type === "notification") {
    console.log(data.options);
    chrome.notifications.create("", data.options);
  }
});
