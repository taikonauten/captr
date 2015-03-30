'use strict';

//Install
chrome.runtime.onInstalled.addListener(function (details) {

  //redirect to options if they're not set aka first start
  if(!localStorage.getItem("options-redmine") || !localStorage.getItem("options-apikey")) {

    chrome.tabs.create({

      url: "options.html"
    });
  }

});
