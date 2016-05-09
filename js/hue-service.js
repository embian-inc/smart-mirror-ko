(function() {
    'use strict';

    function HueService($http) {
        var service = {};
        var geoloc = null;

        service.init = function() {
            //Blink lamp once to indicate readyness
            /*$http.get("https://www.meethue.com/api/nupnp")
            .success(function (data, status, headers) {
                console.log(data);
            })*/

            $http.put(HUE_BASE + 'lights/2/state', {
                "on": true,
                "hue": 4000,
                "sat": 0,
                "transitiontime":10,
                "alert": "select"
            })
            .success(function (data, status, headers) {
                console.log(data);
            })
        };

        //Returns the current forcast along with high and low tempratures for the current day
        service.performUpdate = function(spokenWords) {
            //deturmine the updates that we need to perform to the lights
            var update = deturmineUpdates(spokenWords.toLowerCase().split(" "));
            //Parse the update string and see what actions we need to perform
            console.log(update);

            $http.put(HUE_BASE + 'lights/2/state', update)
            .success(function (data, status, headers) {
                console.log(data);
            })
        }

        service.weeklyForcast = function(){
            if(service.forcast === null){
                return null;
            }
            // Add human readable info to info
            for (var i = 0; i < service.forcast.data.daily.data.length; i++) {
                service.forcast.data.daily.data[i].day = moment.unix(service.forcast.data.daily.data[i].time).format('ddd');
            }
            return service.forcast.data.daily;
        }

        service.refreshWeather = function(){
            return service.init(geoloc);
        }

        //Detect any kind of target color
        function deturmineUpdates(spokenWords){
            console.log("Spoken Words:", spokenWords)
            var update = {};

            //have 1 second for the transition
            update["transitiontime"] = 10;

            for(var i = 0; i <= spokenWords.length; i++){
                console.log("Checking word:", spokenWords[i]);

                if(spokenWords[i] == '빨간색으로'){
                    update["hue"] = 65535;
                    update["sat"] = 254;
                } else if(spokenWords[i] === '초록색으로'){
                    update["hue"] = 25500;
                    update["sat"] = 254;
                } else if(spokenWords[i] == '파란색으로'){
                    update["hue"] = 46920;
                    update["sat"] = 254;
                } else if(spokenWords[i] == '노란색으로'){
                    update["hue"] = 12750;
                    update["sat"] = 254;
                } else if(spokenWords[i] == '핑크색으로'){
                    update["hue"] = 56100;
                    update["sat"] = 254;
                } else if(spokenWords[i] == '흰색으로'){
                    update["sat"] = 0;
                }

                //check for a brightness adjustment
                if(spokenWords[i] == '밝게' || spokenWords[i] == '발개'){
                    update["bri_inc"] = 75;
                } else if(spokenWords[i] == '어둡게'){
                    update["bri_inc"] = -75;
                } else if(spokenWords[i] == '강하게'){
                    update["bri"] = 254;
                } else if(spokenWords[i] == '부드럽게'){
                    update["bri"] = 1;
                } else if(spokenWords[i] == '노말하게'){
                    update["bri"] = 127;
                }

                //are we turning the lights on or off?
                if(spokenWords[i] == '켜'){
                    update["on"] = true;
                    //for some reason we are forgetting the brightness
                    update["bri"] = 127;
                } else if(spokenWords[i] == '꺼'){
                    update["on"] = false;
                }

            }

            return update;
        }

        return service;
    }

    angular.module('SmartMirror')
        .factory('HueService', HueService);

}());
