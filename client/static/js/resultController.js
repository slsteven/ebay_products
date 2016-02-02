app.controller('resultController', function ($scope, $window, ngProgressFactory, $http, fileUpload){
  console.log("test", $window.result);
  for (gmv in $window.result){
    $window.result[gmv].Sum_of_GMV = parseInt($window.result[gmv].Sum_of_GMV)
  }

  // $scope.results = $window.result;

  $scope.sortType = 'Sum_of_GMV';
  $scope.sortReverse = true;
  $scope.search_product_name = '';

  $scope.progressbar = ngProgressFactory.createInstance();
  $scope.progressbar.setHeight('13px');

  $scope.upload_info = {};
  $scope.uploadFile = function(){
    $scope.progressbar.start();
    var uploadUrl = "/upload";

    fileUpload.uploadFileToUrl($scope.upload_info, uploadUrl, function(data){
      if(data.success == true){
        $scope.progressbar.complete();
        $scope.progressbar.setColor('green');
        $scope.filename = data.file_name;
      }
    });
  };

  $scope.get_results = function(data){
    $scope.progressbar.start();
    console.log("filename", data);
    fileUpload.get_results(data, function(res){
      console.log(res);
      $scope.progressbar.complete();
      $scope.results = res.result;
    })
  }
  $scope.search_results = function(data){
    console.log(data.filename)
    fileUpload.search_results(data.filename, function(res){
      console.log(res.result.result)
      $scope.results = res.result.result;
    })
  }

});

app.factory('fileUpload', function($http){
  var factory = {};

  factory.uploadFileToUrl = function(file, uploadUrl, callback){
    var fd = new FormData();
    for(var key in file){
      fd.append(key, file[key]);
    }
    console.log("FILE", file)
    $http.post(uploadUrl, fd, {
      transformRequest: angular.identity,
      headers: {'Content-Type': undefined}
    })
    .success(function(output){
      callback(output);
    })
    .error(function(){
    });
  }

  factory.get_results = function(filename, callback){
    $http.get('/get_results/'+filename).success(function(output){
      callback(output);
    })
  }

  factory.search_results = function(filename, callback){
    console.log("insidefac")
    $http.get('/search_results/' + filename).success(function(output){
      callback(output);
    })
  }
  return factory;
})

app.directive('fileModel', ['$parse', function ($parse) {
  return {
      restrict: 'A',
      link: function(scope, element, attrs) {
          var model = $parse(attrs.fileModel);
          var modelSetter = model.assign;

          element.bind('change', function(){
              scope.$apply(function(){
                  modelSetter(scope, element[0].files[0]);
              });
          });
      }
  };
}]);
