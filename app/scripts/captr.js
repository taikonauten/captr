'use strict';

var app = angular.module('captr', []);

/*
  CONTROLLER



*/

app.controller('PopupCtrl', ['$scope','Redmine', 'Config', function($scope, Redmine, Config) {

  $scope.simpleTicket = false;

}]);

/*
  DIRECTIVE

  changes simpleTicket scope var to show form

*/
app.directive('ticket', function() {
  return {
    restrict: 'A',
    scope: '=',
    link: function(scope, element){

      element.bind("click", function(e){

        scope.simpleTicket = (scope.simpleTicket) ? false : true;
        scope.$apply();

      });
    }
  };

});

app.directive('screenshot', function() {
  return {
    restrict: 'A',
    link: function(scope, element){

      element.bind("click", function(e){

        //get data from current tab
        chrome.tabs.getSelected(null, function(tab){

          localStorage.setItem("url",tab.url);
          localStorage.setItem("width",tab.width);
          localStorage.setItem("height",tab.height);
          localStorage.setItem("status",tab.status);

        });

        chrome.tabs.captureVisibleTab(null, {
          format: "png"
        }, function (data) {

          //save screenshot
          localStorage.setItem("screenshot", data);

          //go to editor page
          chrome.tabs.create({
            url: "captr.html"
          });

        });

      });
    }
  };

});

app.controller('OptionsCtrl', ['$scope','Redmine', 'Config', function($scope, Redmine, Config) {

  $scope.options = {
    "url" : ((localStorage.getItem("options-redmine")) ? localStorage.getItem("options-redmine") : "URL"),
    "apikey" : ((localStorage.getItem("options-apikey")) ? localStorage.getItem("options-apikey") : "X-Redmine-API-Key")
  };

  $scope.saveOptions = function() {

    try {
      localStorage.setItem("options-redmine", $scope.options.url);
      localStorage.setItem("options-apikey", $scope.options.apikey);

    } catch (e) {

      console.log(e);
    }
  };

  $scope.testConnection = function() {

    Redmine.projects()
    .success(function(data,status) {

      $scope.options.access = "ALL GOOD!";
      $scope.options.error = "Status: "+ status;
    })
    .error(function(data,status,headers,config) {

      $scope.options.access = "ERROR - Please update your information";
      $scope.options.error = "Status: "+ status;
    });
  };

}]);

app.controller('EditorCtrl', ['$scope','Redmine', function($scope,Redmine) {

  $scope.issue = {
      "url" : localStorage.getItem('url'),
      "width" : localStorage.getItem('width'),
      "height" : localStorage.getItem('height'),
      "status" : localStorage.getItem('status'),
      "useragent" : navigator.userAgent,
      "os" : navigator.platform,
      "description" : "",
      "subject" : ""
  };

  var path = localStorage.getItem("screenshot");

  var canvas = document.getElementById("c");
  var canvas2 = document.getElementById("d");
  var canvas3 = document.getElementById("r");

  var ctx = canvas.getContext("2d");
  var ctx2 = canvas2.getContext("2d");
  var ctx3 = canvas3.getContext("2d");

  var image = new Image();
  image.src = path;

  image.onload = function() {

    //set dimensions
    ctx.canvas.width = image.width;
    ctx.canvas.height = image.height;

    ctx2.canvas.width = image.width;
    ctx2.canvas.height = image.height;

    ctx3.canvas.width = image.width;
    ctx3.canvas.height = image.height;

    //draw image on visible canvas
    ctx.drawImage(image, 0, 0);

    //draw image on hidden canvas
    ctx3.drawImage(image, 0, 0);
  };

  //retrieve all projects
  Redmine.projects().
  success(function(data, status, headers, config) {

    console.log('success',data);
    $scope.projects = data.projects;
  }).
  error(function(data, status, headers, config) {

    console.log('error',data);
  });

  //retrieve all trackers
  Redmine.trackers().
  success(function(data, status, headers, config) {

    console.log('success',data);
    $scope.trackers = data.trackers;
  }).
  error(function(data, status, headers, config) {

    console.log('error',data);
  });

  //prepare ticket
  $scope.submit = function() {
    if ($scope.project.id) {

      var canvas3 = document.getElementById("r");
      var ctx3 = canvas3.getContext("2d");

      var can2 = document.getElementById('d');

      ctx3.drawImage(can2,0,0)
      var img = ctx3.canvas.toDataURL();

      var binary = atob(img.split(',')[1]);
      var arr = [];
      for(var i = 0; i < binary.length; i++) {
        arr.push(binary.charCodeAt(i));
      }
      var fileBlob = new Blob([new Uint8Array(arr)], {type: 'image/png'});

      Redmine.upload(fileBlob).
      success(function(data, status, headers, config) {

        console.log('success',data);

        $scope.issue.screenshot = data.upload.token;

        Redmine.create($scope.project.id, $scope.tracker.id, $scope.issue).
        success(function(data, status, headers, config) {

          console.log('success',data);

        }).
        error(function(data, status, headers, config) {

          console.log('error',data);
        });

      }).
      error(function(data, status, headers, config) {

        console.log('error',data);
      });

    }
  };

}]);

app.directive("draw", function(){
  return {
    restrict: "A",
    link: function(scope, element){
      var ctx = element[0].getContext('2d');

      // variable that decides if something should be drawn on mousemove
      var drawing = false;

      var r = document.body.clientWidth * 0.8;
      var factor;

      //coordinates
      var rect = {};

      element.bind('mousedown', function(event){

        factor = ctx.canvas.width / r;

        rect.startX = event.offsetX * factor;
        rect.startY = event.offsetY * factor;

        drawing = true;
      });

      element.bind('mousemove', function(event){
        if(drawing){
          // get current mouse position
          rect.wid = (event.offsetX * factor) - rect.startX;
          rect.hgt = (event.offsetY * factor) - rect.startY;
          ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
          draw();
        }

      });
      element.bind('mouseup', function(event){
        // stop drawing
        drawing = false;
      });

      function draw(lX, lY, cX, cY){

        // draw it
        ctx.strokeStyle = "#ff4040";
        ctx.lineWidth   = 3;
        ctx.strokeRect(rect.startX,rect.startY, rect.wid, rect.hgt);
      }
    }
  };
});

app.directive("editedScreen", function(){
  return {
    restrict: "A",
    link: function(scope, element){
      var ctx = element[0].getContext('2d');

      var canvas = document.getElementByTagName("canvas");
      ctx = canvas.getContext('2d');
    }
  };
});

/*

  Config Factory

*/

app.factory('Config', function () {

  return {

    getUrl: function() {

      return localStorage.getItem("options-redmine");
    },

    getApikey: function() {

      return localStorage.getItem("options-apikey");
    },

    getProjectsUrl: function() {

      return localStorage.getItem("options-redmine") + '/projects.json';
    },

    getTrackersUrl: function() {

      return localStorage.getItem("options-redmine") + '/trackers.json';
    },

    getUploadsUrl: function() {

      return localStorage.getItem("options-redmine") + '/uploads.json';
    },

    getIssuesUrl: function() {

      return localStorage.getItem("options-redmine") + '/issues.json';
    },

    getFileHeader: function() {

      var fileHeader = {
        'Content-Type': 'application/octet-stream',
        'X-Redmine-API-Key': localStorage.getItem("options-apikey")
      };

      return fileHeader;
    },

    getJsonHeader: function() {

      var jsonHeader = {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': localStorage.getItem("options-apikey")
      };

      return jsonHeader;
    }

  }

});

/*

  API Factory

*/
app.factory('Redmine', ['$http','Config', function($http, Config) {

  return {

    projects: function () {

      return $http.get(Config.getProjectsUrl(), {headers:Config.getJsonHeader(), params:{limit:100}});
    },

    trackers: function () {

      return $http.get(Config.getTrackersUrl(), {headers:Config.getJsonHeader(), params:{limit:100}});
    },

    upload: function (image) {

      return $http({method:'POST', url:Config.getUploadsUrl(), headers:Config.getFileHeader(), data:image});
    },

    create: function (pid,tid,issue) {

      var issue = {
        "issue": {
          "project_id": pid,
          "tracker_id": tid,
          "subject": issue.subject,
          "description": issue.description,
          "custom_fields":[
            {"value": issue.status,"id":6},
            {"value": issue.url,"id":7},
            {"value": issue.width,"id":4},
            {"value": issue.height,"id":5},
            {"value": issue.useragent,"id":8},
            {"value": issue.os,"id":9}
          ],
          "uploads": [
            {"token": issue.screenshot, "filename": "screenshot.png", "content_type": "image/png"}
          ]
        }
      };

      return $http({method:'POST', url:Config.getIssuesUrl(), headers:Config.getJsonHeader(), data:issue});

    }

  }

}]);
