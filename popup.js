let turnOnOff = document.getElementById('turnOnOff');
let lblStatus = document.getElementById('status-label');

chrome.storage.sync.get(null, function (data) {
  turnOnOff.checked = data.savedTurnOnOff;
  lblStatus.innerHTML = data.savedTurnOnOff ? "Started" : "Stopped";
});

turnOnOff.addEventListener('change', function () {
  if (turnOnOff.checked) {
    lblStatus.innerHTML = "Started";
    chrome.runtime.sendMessage({ action: "start" }, function (response) { });
  } else {
    lblStatus.innerHTML = "Stopped";
    chrome.runtime.sendMessage({ action: "stop" }, function (response) { });
  }

  chrome.storage.sync.set({ savedTurnOnOff: turnOnOff.checked }, function () {
  });
});