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
      table_data(res);
    })
  }
  $scope.search_results = function(data){
    console.log(data.filename)
    fileUpload.search_results(data.filename, function(res){

      $scope.filename = res.result.file_name;
      $scope.results = res.result.result;
      table_data(res);

    })
  }
  $scope.export_results = function(data){
    fileUpload.export_results(data, function(res){

    })
  }

  function table_data(res){
    var ebay_status_counter = 0;
    var ebay_msrp_counter = 0;
    var all_data = res.result.result;

    for(item in all_data){
      if(all_data[item].ebay_status == "Active"){
        ebay_status_counter++;
      }
      if(all_data[item].MSRP !== ""){
        ebay_msrp_counter++;
      }
    }
    $scope.ebay_status_counter = ebay_status_counter;
    $scope.ebay_msrp_counter = ebay_msrp_counter;
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
    $http.get('/search_results/' + filename).success(function(output){
      callback(output);
    })
  }
  factory.export_results = function(filename, callback){
    console.log("export results factory")
    $http.get('/export/' + filename).success(function(output){
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
