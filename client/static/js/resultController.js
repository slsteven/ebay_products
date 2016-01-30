app.controller('resultController', function ($scope, $window, ngProgressFactory, $http, fileUpload){
  console.log("test", $window.result);
  for (gmv in $window.result){
    $window.result[gmv].Sum_of_GMV = parseInt($window.result[gmv].Sum_of_GMV)
  }

  $scope.results = $window.result;

  $scope.sortType = 'Sum_of_GMV';
  $scope.sortReverse = true;
  $scope.search_product_name = '';

  $scope.progressbar = ngProgressFactory.createInstance();
  $scope.progressbar.setHeight('13px');
  $scope.myFile = {};
  $scope.uploadFile = function(){
    $scope.progressbar.start();
    var file = $scope.myFile;
    var uploadUrl = "/scrape";
    fileUpload.uploadFileToUrl(file, uploadUrl, function(data){
      if(data.success == true){
        $scope.progressbar.complete();
         $scope.progressbar.setColor('green');
      }
    });
  };


});

app.factory('fileUpload', function($http){
  var factory = {};
  factory.uploadFileToUrl = function(file, uploadUrl, callback){
    var fd = new FormData();
    fd.append('file', file);
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
