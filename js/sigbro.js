// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() { // Public Domain/MIT
  var d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function sendJSON(url, params, timeout, callback) {
  var args = Array.prototype.slice.call(arguments, 3);
  var xhr = new XMLHttpRequest();
  xhr.ontimeout = function () {
    console.error("The POST request for " + url + " timed out.");
  };
  xhr.onload = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        callback.apply(xhr, args);
      } else { console.error(xhr.statusText); }
    }
  };
  xhr.open("POST", url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.timeout = timeout;
  xhr.send(params);
}

function generateQRcode() {
    var uuid = localStorage.getItem("sigbro_uuid");
    var url = "sigbro://" + uuid;

    var QRC = qrcodegen.QrCode;
    var qr0 = QRC.encodeText(url, QRC.Ecc.HIGH);
    var code = qr0.toSvgString(4);

    var svg = document.getElementById("sigbro_qrcode");
    svg.setAttribute("viewBox", / viewBox="([^"]*)"/.exec(code)[1]);
    svg.querySelector("path").setAttribute("d", / d="([^"]*)"/.exec(code)[1]);
    svg.style.removeProperty("display");
}

function show_qr_code() {
   var uuid = uuidv4();
   localStorage.setItem("sigbro_uuid", uuid); // save it before send

   generateQRcode()

   var url = "https://random.api.nxter.org/api/auth/new";
   param = JSON.stringify({"uuid": uuid }); // prepare request
   sendJSON(url, param, 2000, callback_auth_new); // send uuid to the Sigbro API
}

function callback_auth_new() {
    var resp_j = JSON.parse(this.responseText);
    if ( resp_j.result == "ok" ) {
        console.log("UUID saved.");
        let old_uuid = localStorage.getItem("sigbro_uuid");
        waitForOkay(old_uuid); // start waiting fro the confirmation
    } else {
        localStorage.removeItem("sigbro_uuid");
        console.error("Auth timeout has expired.")
        alert("Something goes wrong. Try again in a few minutes.");
    }
}

// will ask for the result
function waitForOkay(uuid) {
  console.log("Waiting for the confirmation...");
  url = "https://random.nxter.org/api/auth/status";
  param = JSON.stringify({ "uuid": uuid });
  sendJSON(url, param, 2000, callback_auth_status_ok);
}

function callback_auth_status_ok() {
  var resp_j = JSON.parse(this.responseText);

  if ( resp_j.result == "ok" ) {
    localStorage.setItem("sigbro_wallet_accountRS", resp_j.accountRS);
    localStorage.removeItem("sigbro_uuid");
    alert("Yay! Welcome " + resp_j.accountRS + "!");
  } else if (resp_j.result == "wait") {
    old_uuid  = localStorage.getItem("sigbro_uuid");
    (function(uuid) {
        setTimeout(function () {
          waitForOkay(uuid);
        }, Math.floor(Math.random() * 1000)*3 + 3000); // max 6 sec
    })(old_uuid);
  } else {
    alert("Unknown response. Sorry.") ;
  }
}