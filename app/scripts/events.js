'use strict';

//Install
chrome.runtime.onInstalled.addListener(function (details) {

  //redirect to options if they're not set
  if(!localStorage.getItem("options-redmine")) {

    chrome.tabs.create({
      url: "options.html"
    });
  }

});
