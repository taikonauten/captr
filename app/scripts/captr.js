'use strict';

var app = angular.module('captr', ['ngAnimate']);

//TODO: share as global vars!
// app.run(function($rootScope) {
//
//   //indicates i
//   $scope.simpleTicket = false;
//   $scope.loading = false;
// });

/*

  CONSTANTS

*/
app.constant("RELATIVE_WIDTH","0.8");

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
app.directive('ticket', ['Chrome', function(Chrome) {
  return {
    restrict: 'A',
    scope: '=',
    link: function(scope, element){

      element.bind("click", function(e){

        console.log(scope.simpleTicket);
        Chrome.saveBrowserData();

        scope.simpleTicket = (scope.simpleTicket) ? false : true;
        scope.$apply();

      });
    }
  };

}]);

app.directive('screenshot', ['Chrome', function(Chrome) {

  return {
    restrict: 'A',
    scope: '=',
    link: function(scope, element){

      element.bind("click", function(e){

        Chrome.captureScreen();

      });
    }
  };

}]);

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
    .success(function(data/*,status*/) {

      $scope.options.access = "ALL GOOD!";
      //$scope.options.error = "Status: "+ status;
    })
    .error(function(data,status,headers,config) {

      $scope.options.access = "ERROR - Please update your information";
      //$scope.options.error = "Status: "+ status;
    });
  };

}]);

app.controller('FormCtrl', ['$rootScope','$scope','Redmine','Canvas', function($rootScope,$scope,Redmine,Canvas) {

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

  //update user list
  $scope.updateProjectMembers = function(projectId) {

    //retrieve members
    Redmine.memberships(projectId).
    success(function(data, status, headers, config) {

      console.log('success',data);
      $scope.memberships = data.memberships;
    }).
    error(function(data, status, headers, config) {

      console.log('error',data);
    });

    //retrieve all categories
    Redmine.categories(projectId).
    success(function(data, status, headers, config) {

      console.log('success',data);
      $scope.issue_categories = data.issue_categories;
    }).
    error(function(data, status, headers, config) {

      console.log('error',data);
    });

  };

  //prepare ticket
  $scope.submit = function() {

    //check for id and title
    if ($scope.project.id) {

      //if we're in the editor, upload the screenshot first
      if($rootScope.isEditor) {

        Redmine.upload(Canvas.getFileBlob())
        .success(function(data, status, headers, config) {

          console.log('success',data);
          //write screenshot id to scope
          $scope.issue.screenshot = data.upload.token;

          createTicket($scope.project.id, $scope.tracker.id, $scope.selectedMember, $scope.category.id, $scope.issue);

        }).
        error(function(data, status, headers, config) {

          console.log('error',data);

        });

      } else {

        createTicket($scope.project.id, $scope.tracker.id, $scope.selectedMember, $scope.category.id, $scope.issue);

      }

    }
  };

  function createTicket(projectId, trackerId, userId, category, issue) {

    Redmine.create(projectId, trackerId, userId, category, $scope.issue)
    .success(function(data, status, headers, config) {

      console.log('success',data);
      //write screenshot id to scope
      alert('success!');

    }).
    error(function(data, status, headers, config) {

      console.log('error',data);
    });
  }

}]);

/*

  CONTROLLER

  editor logic

*/
app.controller('EditorCtrl', ['$rootScope','$scope','Redmine','Canvas', function($rootScope,$scope,Redmine,Canvas) {

  $rootScope.isEditor = true;

  Canvas.init();

}]);

app.factory("Canvas",function(){

  var path, canvas, canvas2, ctx, ctx2, image;

  return {

    init: function() {

      path = localStorage.getItem("screenshot");

      canvas = document.getElementById("c");
      canvas2 = document.getElementById("d");

      ctx = canvas.getContext("2d");
      ctx2 = canvas2.getContext("2d");

      image = new Image();
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

    },

    getFileBlob: function() {

      ctx.drawImage(canvas2,0,0)
      var img = ctx.canvas.toDataURL();

      var binary = atob(img.split(',')[1]);
      var arr = [];
      for(var i = 0; i < binary.length; i++) {
        arr.push(binary.charCodeAt(i));
      }

      return new Blob([new Uint8Array(arr)], {type: 'image/png'});
    }

  }

});

app.directive("draw", ['RELATIVE_WIDTH', function(relativeWidth){
  return {
    restrict: "A",
    link: function(scope, element){

      var ctx = element[0].getContext('2d');

      var factor, dragoffx, dragoffy, offsetX, offsetY;

      // var for maintining some sort of state
      var drawing = false;
      var dragging = false;

      var r = document.body.clientWidth * relativeWidth;

      //rect object
      var rect = {};

      element.bind('mousedown', function(event){

        //do it everytime, fixes resize issues
        factor = ctx.canvas.width / r;

        //offsets
        offsetX = event.offsetX * factor;
        offsetY = event.offsetY * factor;

        //when its set - check if you're inside
        if(rect.startX && rect.startY) {

          if(offsetX < (rect.savedStartX + rect.width) && offsetX > rect.savedStartX && offsetY < (rect.savedStartY + rect.height) && offsetY > rect.savedStartY) {

            dragging = true;

            dragoffx = offsetX - rect.savedStartX;
            dragoffy = offsetY - rect.savedStartY;

            return;

          }

        }

        rect.startX = offsetX;
        rect.startY = offsetY;

        drawing = true;

      }).bind('mousemove', function(event){

        //offsets
        offsetX = event.offsetX * factor;
        offsetY = event.offsetY * factor;

        if(drawing){

          //save coords
          rect.savedStartX = rect.startX;
          rect.savedStartY = rect.startY;

          // get current mouse position
          rect.width = offsetX - rect.startX;
          rect.height = offsetY - rect.startY;

          clear();
          draw();
        }

        if(dragging) {

          rect.startX = offsetX - dragoffx;
          rect.startY = offsetY - dragoffy;

          //save coords
          rect.savedStartX = rect.startX;
          rect.savedStartY = rect.startY;

          clear();
          draw();
        }

        return;

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
        ctx.strokeRect(rect.startX, rect.startY, rect.width, rect.height);

        //drawOutside();
      }

      function drawOutside() {

        //clear first
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // draw dark outside
        ctx.fillStyle = 'rgba(0,0,0,0.2)';

        //check if we have negative values and adjust them
        if(rect.height < 0) {
          rect.height = rect.height * (-1);
          //rect.startY = rect.startY - rect.height;
          rect.savedStartY = rect.startY - rect.height;
        }

        if(rect.width < 0) {
          rect.width = rect.width * (-1);
          //rect.startX = rect.startX - rect.width;
          rect.savedStartX = rect.startX - rect.width;
        }

        //top
        ctx.fillRect(0, 0, ctx.canvas.width, rect.savedStartY);
        //left
        ctx.fillRect(0, rect.savedStartY, rect.savedStartX, ctx.canvas.height + rect.height);
        //right
        ctx.fillRect((rect.savedStartX + rect.width), rect.savedStartY, (ctx.canvas.width - rect.savedStartX) + rect.width, ctx.canvas.height + rect.height);
        //bottom
        ctx.fillRect(rect.savedStartX, (rect.savedStartY + rect.height), rect.width, (ctx.canvas.height - (rect.savedStartY + rect.height)));
      }
    }
  };
}]);

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

    getMembershipsUrl: function(projectId) {

      // var membersUrl = $resource(localStorage.getItem("options-redmine")+'/projects/:projectId/memberships.json',{},
      //       post:{
      //         method:"POST",
      //         isArray:false,
      //         headers:{'X-Redmine-API-Key':localStorage.getItem("options-apikey"),
      //                  'Content-Type': 'application/json'}
      //     });

      return localStorage.getItem("options-redmine") + '/projects/' + projectId + '/memberships.json'
    },

    getCategoryUrl: function(projectId) {

      return localStorage.getItem("options-redmine") + '/projects/' + projectId + '/issue_categories.json'
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

    memberships: function (projectId) {

      return $http.get(Config.getMembershipsUrl(projectId), {headers:Config.getJsonHeader()});
    },

    categories: function (projectId) {

      return $http.get(Config.getCategoryUrl(projectId), {headers:Config.getJsonHeader()});
    },

    trackers: function () {

      return $http.get(Config.getTrackersUrl(), {headers:Config.getJsonHeader(), params:{limit:100}});
    },

    upload: function (image) {

      return $http({method:'POST', url:Config.getUploadsUrl(), headers:Config.getFileHeader(), data:image});
    },

    create: function (pid,tid,uid,cid,issue) {

      var issue = {
        "issue": {
          "project_id": pid,
          "tracker_id": tid,
          "subject": issue.subject,
          "description": issue.description,
          "assigned_to_id": uid,
          "category_id": cid,
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

/*

  CHROME FACTORY

*/
app.factory('Chrome', function() {

  return {

    saveBrowserData: function() {

      //fetch data from current tab
      chrome.tabs.getSelected(null, function(tab){

        localStorage.setItem("url",tab.url);
        localStorage.setItem("width",tab.width);
        localStorage.setItem("height",tab.height);
        localStorage.setItem("status",tab.status);

      });

    },

    captureScreen: function() {

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
    }

  };

});
