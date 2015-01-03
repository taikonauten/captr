'use strict';

var app = angular.module('captr', []);

app.directive('screenshot', function() {
  return {
    restrict: 'A',
    link: function(scope, element){

      element.bind("click", function(e){

        chrome.tabs.captureVisibleTab(null, {
          format: "png"
        }, function (data) {
          localStorage.setItem("screenshot", data);

          chrome.tabs.create({
            url: "captr.html"
          }, function (tab) {

            console.log(tab);

          });

        });

      });
    }
  };

});

app.directive('submit', function(Redmine) {
  return {
    restrict: 'A',
    link: function(scope, element){

      element.bind('click',function(){

        var binary = atob(localStorage.getItem("screenshot").split(',')[1]);
        var arr = [];
        for(var i = 0; i < binary.length; i++) {
          arr.push(binary.charCodeAt(i));
        }
        var fileBlob = new Blob([new Uint8Array(arr)], {type: 'image/png'});

        //Redmine.projects().
        Redmine.upload(fileBlob).
        success(function(data, status, headers, config) {

          console.log('success',data);
          Redmine.create(data.upload.token).
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
      });
    }
  }
});

app.controller('EditorCtrl', ['$scope','Redmine', function($scope,Redmine) {

  var path = localStorage.getItem("screenshot");
  $scope.path = path;

  Redmine.projects().
  success(function(data, status, headers, config) {

    console.log('success',data);
    $scope.projects = data.projects;
  }).
  error(function(data, status, headers, config) {

    console.log('error',data);
  });

}]);

/*

  API Factory

*/
app.factory('Redmine', function ($http) {

  var urlbase     = 'https://redmine.taikocloud.com',
      projectsUrl = urlbase + '/projects.json',
      trackersUrl = urlbase + '/trackers.json',
      uploadUrl   = urlbase + '/uploads.json',
      issuesUrl   = urlbase + '/issues.json';

  //headers
  var file = {
    'Content-Type': 'application/octet-stream',
    'X-Redmine-API-Key': '397317ea854b5e56413af2c90b4376aef17f2c90'
  };

  var json = {
    'Content-Type': 'application/json',
    'X-Redmine-API-Key': '397317ea854b5e56413af2c90b4376aef17f2c90'
  };

  return {

    projects: function () {

      return $http.get(projectsUrl, {headers:json,params:{limit:100}});
    },

    upload: function (image) {

      return $http({method:'POST', url:uploadUrl, headers:file, data:image});
    },

    create: function (imgToken) {

      var issue = {
        "issue": {
          "project_id": "2",
          "subject": "Creating an issue with a uploaded file #2",
          "uploads": [
            {"token": imgToken, "filename": "screenshot.png", "content_type": "image/png"}
          ]
        }
      };

      return $http({method:'POST', url:issuesUrl, headers:json, data:issue});

    }


  }

});
