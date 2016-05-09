(function(angular) {
  'use strict';

  function MirrorCtrl(AnnyangService, GeolocationService, WeatherService, MapService, SubwayService, YoutubeService, HueService, $scope, $timeout, $sce) {
    var _this = this;
    var command = COMMANDS.ko;
    var DEFAULT_COMMAND_TEXT = command.default;
    $scope.listening = false;
    $scope.debug = false;
    $scope.complement = command.hi;
    $scope.focus = "default";
    $scope.user = {};
    $scope.interimResult = DEFAULT_COMMAND_TEXT;

    $scope.colors=["#6ed3cf", "#9068be", "#e1e8f0", "#e62739"];
    //Update the time
    var tick = function() {
      $scope.date = new Date();
      $timeout(tick, 1000 * 60);
    };

    // Reset the command text
    var restCommand = function(){
      $scope.interimResult = DEFAULT_COMMAND_TEXT;
    }

    _this.init = function() {
      $scope.map = MapService.generateMap("Seoul,Korea");
      _this.clearResults();
      tick();
      restCommand();

      var playing = false, sound;
      //Get our location and then get the weather for our location
      GeolocationService.getLocation().then(function(geoposition){
        console.log("Geoposition", geoposition);
        WeatherService.init(geoposition).then(function(){
          $scope.currentForcast = WeatherService.currentForcast();
          $scope.weeklyForcast = WeatherService.weeklyForcast();
          console.log("Current", $scope.currentForcast);
          console.log("Weekly", $scope.weeklyForcast);
          //refresh the weather every hour
          //this doesn't acutually updat the UI yet
          //$timeout(WeatherService.refreshWeather, 3600000);
        });
      })

      // Hue communication
      HueService.init();

      var defaultView = function() {
        console.debug("Ok, going to default view...");
        $scope.focus = "default";
      }

      // List commands
      AnnyangService.addCommand(command.whatcanisay, function() {
        console.debug("Here is a list of commands...");
        console.log(AnnyangService.commands);
        $scope.focus = "commands";

      });

      // Go back to default view
      AnnyangService.addCommand(command.home, defaultView);

      // Hide everything and "sleep"
      AnnyangService.addCommand(command.sleep, function() {
        console.debug("Ok, going to sleep...");
        $scope.focus = "sleep";
      });

      // Go back to default view
      AnnyangService.addCommand(command.wake, defaultView);

      AnnyangService.addCommand(command.debug, function() {
        console.debug("Boop Boop. Showing debug info...");
        $scope.debug = true;
      });

      AnnyangService.addCommand(command.map, function() {
        console.debug("Going on an adventure?");
        $scope.focus = "map";
      });

      AnnyangService.addCommand(command.locaiton, function(location) {
        console.debug("Getting map of", location);
        $scope.map = MapService.generateMap(location);
        $scope.focus = "map";
      });

      // Zoom in map
      AnnyangService.addCommand(command.zoomin, function() {
        console.debug("Zoooooooom!!!");
        $scope.map = MapService.zoomIn();
      });

      AnnyangService.addCommand(command.zoomout, function() {
        console.debug("Moooooooooz!!!");
        $scope.map = MapService.zoomOut();
      });

      AnnyangService.addCommand(command.zoomvalue, function(value) {
        console.debug("Moooop!!!", value);
        $scope.map = MapService.zoomTo(value);
      });

      AnnyangService.addCommand(command.zoomreset, function() {
        $scope.map = MapService.reset();
        $scope.focus = "map";
      });

      // Change name
      AnnyangService.addCommand(command.name, function(name) {
        console.debug("Hi", name, "nice to meet you");
        $scope.user.name = name;
      });

      AnnyangService.addCommand(command.task, function(task) {
        console.debug("I'll remind you to", task);
      });

      AnnyangService.addCommand(command.reminder, function() {
        console.debug("Clearing reminders");
      });

      // Clear log of commands
      AnnyangService.addCommand(command.clear, function(task) {
        console.debug("Clearing results");
        _this.clearResults()
      });

      // Check the time
      AnnyangService.addCommand(command.time, function(task) {
        console.debug("It is", moment().format('h:mm:ss a'));
        _this.clearResults();
      });

      // Turn lights off
      AnnyangService.addCommand(command.light, function(state, action) {
        HueService.performUpdate(state + " " + action);
      });

      AnnyangService.addCommand(command.playyoutube, function(term) {

        YoutubeService.getYoutube(term,'video').then(function(){
          if(term){
            var videoId = YoutubeService.getVideoId()
            $scope.focus = "youtube";
            $scope.youtubeurl = "http://www.youtube.com/embed/" + videoId + "?autoplay=1&enablejsapi=1&version=3&playerapiid=ytplayer"
            $scope.currentYoutubeUrl = $sce.trustAsResourceUrl($scope.youtubeurl);
          }
        });
      });

      AnnyangService.addCommand(command.ytbplaylist, function(term) {

        YoutubeService.getYoutube(term,'playlist').then(function(){
          if(term){
            var playlistId = YoutubeService.getPlaylistId()
            $scope.focus = "youtube";
            $scope.youtubeurl = "http://www.youtube.com/embed?autoplay=1&listType=playlist&enablejsapi=1&version=3&list="+playlistId
            $scope.currentYoutubeUrl = $sce.trustAsResourceUrl($scope.youtubeurl);
          }
        });
      });

      AnnyangService.addCommand(command.stopyoutube, function() {
        var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
        iframe.postMessage('{"event":"command","func":"' + 'stopVideo' +   '","args":""}', '*');
        $scope.focus = "default";
      });

      AnnyangService.addCommand(command.subway, function(station,linenumber,updown) {
        SubwayService.init(station).then(function(){
          SubwayService.getArriveTime(linenumber,updown).then(function(data){
            if(data != null){
              $scope.subwayinfo = data[0].ARRIVETIME + "에 " + data[0].SUBWAYNAME + "행 열차가 들어오겠습니다.";
            }else{
              $scope.subwayinfo = "운행하는 열차가 존재 하지 않습니다."
            }
            $scope.focus = "subway";
          });
        });
      });

      AnnyangService.addCommand(command.term, function(term) {
        console.debug("Showing", term);
      });

      // Fallback for all commands
      AnnyangService.addCommand('*allSpeech', function(allSpeech) {
        console.debug(allSpeech);
        _this.addResult(allSpeech);
      });

      var resetCommandTimeout;
      //Track when the Annyang is listening to us
      AnnyangService.start(function(listening){
        $scope.listening = listening;
      }, function(interimResult){
        $scope.interimResult = interimResult;
        $timeout.cancel(resetCommandTimeout);
      }, function(result){
        $scope.interimResult = result[0];
        resetCommandTimeout = $timeout(restCommand, 5000);
      });
    };

    _this.addResult = function(result) {
      _this.results.push({
        content: result,
        date: new Date()
      });
    };

    _this.clearResults = function() {
      _this.results = [];
    };

    _this.init();
  }

  angular.module('SmartMirror')
  .controller('MirrorCtrl', MirrorCtrl);

}(window.angular));
