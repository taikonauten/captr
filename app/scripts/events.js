'use strict';

//GLOBAL VARS
var captrPower = false,
    activeTabId = -1;

//additional stuff after install
chrome.runtime.onInstalled.addListener(function (details) {

  console.log('previousVersion', details.previousVersion);

  //set badge text
  //chrome.browserAction.setBadgeText({text: 'OFF'});

});

//click on extension button
// chrome.browserAction.onClicked.addListener(function (tab) {
//
//   if(captrPower) {
//
//     captrPower = false;
//     activeTabId = -1;
//
//     //set badge text
//     chrome.browserAction.setBadgeText({text: 'OFF'});
//
//     //TODO: remove angularstuff and scripts ?!
//
//   } else {
//
//     captrPower = true;
//     activeTabId = tab.id;
//
//     //set badge text
//     chrome.browserAction.setBadgeText({text: 'ON'});
//
//     //additional listeners
//     // chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
//     //   console.log(chrome.runtime.lastError);
//     //   //re-init if necessary
//     //   if(changeInfo.status === 'complete' && captrPower) {
//     //
//     //     chrome.tabs.executeScript(null, {code: 'launchCaptr();'});
//     //
//     //     console.log('change info', changeInfo);
//     //   }
//     //
//     // });
//
//     //init on active tab
//     chrome.tabs.get(activeTabId, function () {
//
//       chrome.tabs.executeScript(null, {code: 'launchCaptr();'});
//
//     });
//
//   }
//
// });

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    //optional: if (request == "requestImgSrc") {}
    chrome.tabs.captureVisibleTab(
      null,
    {},
    function(dataUrl){
      sendResponse({imgSrc:dataUrl});
      
    }
  );
  return true;
}
);
