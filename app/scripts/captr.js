'use strict';

var app = angular.module('captr', []);

// app.run(function($rootScope) {
//
//   //indicates i
//   $scope.simpleTicket = false;
//   $scope.loading = false;
// })

/*
  CONTROLLER

  used for the popup

*/

app.controller('PopupCtrl', ['$scope','Redmine', 'Config', function($scope, Redmine, Config) {

  $scope.simpleTicket = false;
  $scope.loading = false;

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

        console.log('sT before',scope.simpleTicket);

        //fetch data from current tab
        chrome.tabs.getSelected(null, function(tab){

          localStorage.setItem("url",tab.url);
          localStorage.setItem("width",tab.width);
          localStorage.setItem("height",tab.height);
          localStorage.setItem("status",tab.status);

        });


        scope.simpleTicket = (scope.simpleTicket) ? false : true;
        scope.$apply();

        console.log('sT after',scope.simpleTicket);

      });
    }
  };

});

app.directive('back', function() {
  return {
    restrict: 'A',
    scope: '=',
    link: function(scope, element){

      element.bind("click", function(e){

        console.log('sT before',scope.simpleTicket);

        scope.simpleTicket = false;
        scope.$apply();

        console.log('sT after',scope.simpleTicket);

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

app.controller('FormCtrl', ['$rootScope','$scope','Redmine', function($rootScope,$scope,Redmine) {

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

    //check for id and title
    if ($scope.project.id) {

      //if we're in the editor, upload the screenshot first
      if($rootScope.isEditor) {

        //TODO: needs some sort of promise!
        var scope = angular.element(document.getElementById('editor')).scope();
          scope.$apply(function(){

          scope.getImageBlob();
        });


        Redmine.upload($rootScope.blob)
        .success(function(data, status, headers, config) {

          console.log('success',data);
          //write screenshot id to scope
          $scope.issue.screenshot = data.upload.token;

        }).
        error(function(data, status, headers, config) {

          console.log('error',data);
        });

      }

      Redmine.create($scope.project.id, $scope.tracker.id, $scope.issue)
      .success(function(data, status, headers, config) {

        console.log('success',data);
        //write screenshot id to scope
        alert('success!');

      }).
      error(function(data, status, headers, config) {

        console.log('error',data);
      });

    }
  };

}]);

/*

TODO: rewrite as directive


*/
app.controller('EditorCtrl', ['$rootScope','$scope','Redmine', function($rootScope,$scope,Redmine) {

  $rootScope.isEditor = true;

  var path = localStorage.getItem("screenshot");

  var canvas = document.getElementById("c");
  var canvas2 = document.getElementById("d");

  var ctx = canvas.getContext("2d");
  var ctx2 = canvas2.getContext("2d");

  var image = new Image();
  image.src = path;

  image.onload = function() {

    //set dimensions
    ctx.canvas.width = image.width;
    ctx.canvas.height = image.height;

    ctx2.canvas.width = image.width;
    ctx2.canvas.height = image.height;

    //draw image on visible canvas
    ctx.drawImage(image, 0, 0);
  };

  $scope.getImageBlob = function() {

    ctx.drawImage(canvas2,0,0)
    var img = ctx.canvas.toDataURL();

    var binary = atob(img.split(',')[1]);
    var arr = [];
    for(var i = 0; i < binary.length; i++) {
      arr.push(binary.charCodeAt(i));
    }

    $rootScope.blob = new Blob([new Uint8Array(arr)], {type: 'image/png'});

  };

}]);

app.directive("draw", function(){
  return {
    restrict: "A",
    link: function(scope, element){

      var ctx = element[0].getContext('2d');

      var factor,dragoffx,dragoffy;

      // variable that decides if something should be drawn on mousemove
      var drawing = false;
      var dragging = false;

      var r = document.body.clientWidth * 0.8;

      //rect object
      var rect = {};

      element.bind('mousedown', function(event){

        //do it everytime, fixes resize issues
        factor = ctx.canvas.width / r;

        //when its set - check if you're inside
        if(rect.startX && rect.startY) {

          if(((event.offsetX * factor) < (rect.savedStartX + rect.wid) && (event.offsetX * factor) > rect.savedStartX) && ((event.offsetY * factor) < (rect.savedStartY + rect.hgt) && (event.offsetY * factor) > rect.savedStartY)) {

            move = true;

            dragoffx = (event.offsetX * factor) - rect.savedStartX;
            dragoffy = (event.offsetY * factor) - rect.savedStartY;

            return;

          }

        }

        rect.startX = event.offsetX * factor;
        rect.startY = event.offsetY * factor;

        drawing = true;

      }).bind('mousemove', function(event){

        if(drawing){

          //save coords
          rect.savedStartX = rect.startX;
          rect.savedStartY = rect.startY;

          // get current mouse position
          rect.wid = (event.offsetX * factor) - rect.startX;
          rect.hgt = (event.offsetY * factor) - rect.startY;

          clear();
          draw();
        }

        if(dragging) {

          rect.startX = (event.offsetX * factor) - dragoffx;
          rect.startY = (event.offsetY * factor) - dragoffy;

          //save coords
          rect.savedStartX = rect.startX;
          rect.savedStartY = rect.startY;

          clear();
          draw();
        }

      }).bind('mouseup', function(event){

        //single draw outside option
        drawOutside();

        // stop drawing
        drawing = false;

        // stop moving
        dragging = false;
      });

      function clear() {

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }

      function draw(){

        // draw it
        ctx.strokeStyle = "#F4BA41";
        ctx.lineWidth   = 3;
        ctx.strokeRect(rect.startX, rect.startY, rect.wid, rect.hgt);

        //drawOutside();
      }

      //TODO: we need to check direction, only LR is working ATM!
      function drawOutside() {

        //clear first
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // draw dark outside
        ctx.fillStyle = 'rgba(0,0,0,0.2)';

        //check if we have negative values and adjust them
        if(rect.hgt < 0) {
          rect.hgt = rect.hgt * (-1);
          //rect.startY = rect.startY - rect.hgt;
          rect.savedStartY = rect.startY - rect.hgt;
        }

        if(rect.wid < 0) {
          rect.wid = rect.wid * (-1);
          //rect.startX = rect.startX - rect.wid;
          rect.savedStartX = rect.startX - rect.wid;
        }

        //top
        ctx.fillRect(0, 0, ctx.canvas.width, rect.savedStartY);
        //left
        ctx.fillRect(0, rect.savedStartY, rect.savedStartX, ctx.canvas.height + rect.hgt);
        //right
        ctx.fillRect((rect.savedStartX + rect.wid), rect.savedStartY, (ctx.canvas.width - rect.savedStartX) + rect.wid, ctx.canvas.height + rect.hgt);
        //bottom
        ctx.fillRect(rect.savedStartX, (rect.savedStartY + rect.hgt), rect.wid, (ctx.canvas.height - (rect.savedStartY + rect.hgt)));
      }
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
