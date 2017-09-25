bhvApp.controller('LoginController', ['$scope', '$state', 'PhonegapService', 'appConfig', '$rootScope', '$translate', 'EchoService', 'ConnectSqliteDB', '$timeout', 'dialogs', 'FileSystemService', 'CommonService', function LoginController($scope, $state, PhonegapService, appConfig, $rootScope, $translate, EchoService, ConnectSqliteDB, $timeout, dialogs, FileSystemService, CommonService) {
    
        $scope.isLoggedIn = false;
                                           $rootScope.loading = false;
        $scope.errMsgUsername = "";
        $scope.errMsgPassword = "";
        $scope.errMessage = "";
    
        $scope.version = appConfig.version;
        $translate.use("NL");
        EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController: start", "App version:" + appConfig.version);
        EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController: ", "apple device model:" + device.model);
        EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController: ", "device iOS version:" + device.version);
    
    
        if (localStorage.loginImagePath && localStorage.loginImagePath != 'undefined') {
            $scope.imageLogin = localStorage.loginImagePath;
        } else {
            $scope.imageLogin = "images/logo.png";
        }
    
        //for old version fix without version info
        if (localStorage.version == null || CommonService.compareVersion(localStorage.version, appConfig.version)) {
            EchoService.writeLog(EchoService.LEVEL_INFO, "Login", "Performing version upgrade cleanup: Current version:" + localStorage.version + "\tUpgrading to:" + appConfig.version);
    
            localStorage.clear();
            localStorage.version = appConfig.version;
    
            //delete old database which is giving issue somehow
            ConnectSqliteDB.deleteDB(function(response) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "Login", 'Cleanup old version DB:' + response);
            });
        }
    
        if (localStorage.authenticationKey != null && localStorage.userName != null && localStorage.userId != null) {
            if (localStorage.authenticationKey.length > 0) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController:", 'Login resuming previous login for :' + localStorage.userName);
                EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController:", "Domain :" + localStorage.domain);
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "LoginController: start", "UserName:" + localStorage.userName);
    
                if (localStorage.locale) {
                    $translate.use(localStorage.locale);
                }
                //			PhonegapService.getAppPermissionValue(function(pluginResponse) {
                //	    		var obj = JSON.parse(pluginResponse);
                //	    		if(obj.isAllPermissionGranted == false){
                //	    			//localStorage.clear();
                //	    		}
                //	    	}, function(error){
                //				EchoService.writeLog(EchoService.LEVEL_ERROR ,"LoginController:" ,'error retriving permission value:' +  error);
                //			});
    
                $scope.isLoggedIn = true;
    
                PhonegapService.getNotificationMessage(function(messageDetails) {
                    try {
                        if (messageDetails != null && messageDetails.length > 0) {
    
                            var objJson = JSON.parse(messageDetails);
    
                            if (objJson.Type == "LoneWorker") {
                                $timeout(function() {
                                    $state.go('loneworker', { 'messageDetails': encodeURIComponent(JSON.stringify(objJson)) });
                                });
    
                            } else if (objJson.Type == "Calamity") {
                                $timeout(function() {
                                    $state.go('calamity', { 'messageDetails': encodeURIComponent(JSON.stringify(objJson)) });
                                });
                            } else if (objJson.Type == "BuzzerMessage") {
                                $timeout(function() {
                                    $state.go('buzzer', { 'messageDetails': encodeURIComponent(JSON.stringify(objJson)) });
                                });
                            } else if (objJson.Type == 'HeartBeat') {
                                $state.go('main.home');
    
                                var message = {
                                    'detail': objJson
                                };
                                var event = new CustomEvent('Event', message);
    
                                event.initEvent('heartBeatendetected', true, true);
    
                                document.body.dispatchEvent(event); //document.dispatchEvent(event);
    
                            } else if (objJson.Type == 'Beacon') {
                                $timeout(function() {
                                    $state.go('beacon', { 'messageDetails': encodeURIComponent(JSON.stringify(objJson)) });
                                });
                            } else if (objJson.Type == 'WifiNetworks') {
                                $timeout(function() {
                                    $state.go('wifiNetworks', { 'messageDetails': encodeURIComponent(JSON.stringify(objJson)) });
                                });
                            } else {
                                $state.go('main.home');
                            }
    
                        } else {
                            $state.go('main.home');
                        }
                    } catch (error) {
                        $state.go('main.home');
                    }
                });
    
    
            }
        }
    
        $scope.username = "";
        $scope.password = "";
        $scope.domain = "";
    
    
        function onError() {
            $scope.password = "";
    
            $scope.errMsgUsername = $scope.username;
            $scope.errMsgPassword = $scope.password;
            $translate('label-InternetConnection').then(function(val) {
                $scope.errMessage = val;
            });
        }
    
        $scope.login = function(loginForm) {
    
            $scope.errMessage = "";
            if (!loginForm.$valid) {
                return;
            }
    
            var pluginParam = {
                "url": appConfig.url + "/login",
                "requesttype": "POST",
                "X-LoginSource": "mobile",
                "params": {
                    "userName": $scope.username,
                    "password": $scope.password,
                    "domain": $scope.domain,
                    "accessKey": appConfig.accessKey
                }
            }
            $rootScope.loading = true;
            PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                try {
                    var obj = JSON.parse(pluginResponse);
                    localStorage.authenticationKey = obj.LoginResult.AuthenticationKey;
                    localStorage.userId = obj.LoginResult.UserId;
                    localStorage.userName = obj.LoginResult.UserName;
                    localStorage.locale = obj.LoginResult.Locale;
                    if (localStorage.locale == "undefined") {
                        localStorage.locale = "";
                    }
                    $translate.use(localStorage.locale);
                    localStorage.domain = $scope.domain;
                    localStorage.isLoneWorkerActive = obj.LoginResult.IsLoneWorkerActive;
                    EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController: start", "Domain:" + localStorage.domain);
                    EchoService.writeLog(EchoService.LEVEL_INFO, "LoginController: start", "UserName:" + localStorage.userName);
    
                    var pluginParamMessageStatuses = {
                        "url": appConfig.url + "/MessageStatuses",
                        "requesttype": "GET",
                        "authenticationkey": localStorage.authenticationKey,
                        "params": {}
                    }
    
                    PhonegapService.callWebservice(pluginParamMessageStatuses, function(pluginResponse) {
                        try {
    
                            var objmessageStatues = JSON.parse(pluginResponse);
                            var temp = objmessageStatues[0].MessageStatusId;
                            localStorage.MessageStatuses = JSON.stringify(objmessageStatues);
                            var arrayMessageStatuses = JSON.parse(localStorage.MessageStatuses);
    
                            angular.forEach(arrayMessageStatuses, function(value, key) {
                                if (value.Code == "NOTSENT") {
                                    localStorage.notsent = value.MessageStatusId;
                                } else if (value.Code == "SENT") {
                                    localStorage.sent = value.MessageStatusId;
                                } else if (value.Code == "READ") {
                                    localStorage.read = value.MessageStatusId;
                                }
                            });
    
                        } catch (error) {
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'Error parsing message statuses:' + error);
                        }
                    }, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'Error retriving message statuses:' + error);
                    });
    
                    var pluginParamPersonStatuses = {
                        "url": appConfig.url + "/PersonStatuses",
                        "requesttype": "GET",
                        "authenticationkey": localStorage.authenticationKey,
                        "params": {}
                    }
    
                    PhonegapService.callWebservice(pluginParamPersonStatuses, function(pluginResponse) {
                        try {
    
                            var objPersonStatues = JSON.parse(pluginResponse);
                            var temp = objPersonStatues[0].PersonStatusID;
                            localStorage.personStatuses = JSON.stringify(objPersonStatues);
    
                            return;
                        } catch (error) {
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'Error sending PersonStatuses level-1:' + error);
                        }
                    }, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'Error sending PersonStatuses level-2:' + error);
                    });
    
                    var pluginParamSettings = {
                        "url": appConfig.url + "/Settings",
                        "requesttype": "GET",
                        "authenticationkey": localStorage.authenticationKey,
                        "params": {}
                    }
    
                    PhonegapService.callWebservice(pluginParamSettings, function(pluginResponse) {
                        try {
    
                            var objSettings = JSON.parse(pluginResponse);
                            var temp = objSettings[0].SettingId;
                            localStorage.Settings = JSON.stringify(objSettings);
                            var tempSettings = JSON.parse(localStorage.Settings);
                            for (var i = 0; i < tempSettings.length; i++) {
                                if (tempSettings[i].SettingName.toLowerCase() == "LoneworkerInterval".toLowerCase()) {
                                    localStorage.LoneworkerInterval = tempSettings[i].SettingValue;
                                } else if (tempSettings[i].SettingName.toLowerCase() == "EnableMobileUserStatus".toLowerCase()) {
                                    localStorage.EnableMobileUserStatus = tempSettings[i].SettingValue;
                                } else if (tempSettings[i].SettingName.toLowerCase() == "LocationMode".toLowerCase()) {
                                    localStorage.LocationMode = tempSettings[i].SettingValue;
                                    localStorage.setPersonActiveByDefault = "true";
                                    if (localStorage.LocationMode.toLowerCase() == 'BeaconGlobal'.toLowerCase() || localStorage.LocationMode.toLowerCase() == 'BeaconLocal'.toLowerCase()) {
                                        localStorage.EnableBeaconService = "true";
                                        localStorage.GeoFencingModeEnable = "false";
                                        localStorage.EnableWifiService = "false";
                                        localStorage.setPersonActiveByDefault = "false";
                                    } else if (localStorage.LocationMode.toLowerCase() == 'GPSGlobal'.toLowerCase() || localStorage.LocationMode.toLowerCase() == 'GPSLocal'.toLowerCase()) {
                                        localStorage.EnableBeaconService = "false";
                                        localStorage.GeoFencingModeEnable = "true";
                                        localStorage.EnableWifiService = "false";
                                        localStorage.setPersonActiveByDefault = "true";
                                    } else if (localStorage.LocationMode.toLowerCase() == 'WIFIGlobal'.toLowerCase() || localStorage.LocationMode.toLowerCase() == 'WIFILocal'.toLowerCase()) {
                                        localStorage.EnableBeaconService = "false";
                                        localStorage.GeoFencingModeEnable = "false";
                                        localStorage.EnableWifiService = "true";
                                        localStorage.setPersonActiveByDefault = "false";
                                    } else {
                                        localStorage.EnableBeaconService = "false";
                                        localStorage.GeoFencingModeEnable = "false";
                                        localStorage.EnableWifiService = "false";
                                        localStorage.setPersonActiveByDefault = "true";
                                    }
    
                                } else if (tempSettings[i].SettingName.toLowerCase() == "DeviceGPSTimeThreshold".toLowerCase()) {
                                    localStorage.DeviceGPSTimeThreshold = tempSettings[i].SettingValue;
                                } else if (tempSettings[i].SettingName.toLowerCase() == "DeviceGPSDistanceThreshold".toLowerCase()) {
                                    localStorage.DeviceGPSDistanceThreshold = tempSettings[i].SettingValue;
                                } else if (tempSettings[i].SettingName.toLowerCase() == "BeaconInterval".toLowerCase()) {
                                    localStorage.BeaconInterval = tempSettings[i].SettingValue;
                                } else if (tempSettings[i].SettingName.toLowerCase() == "DebugMode".toLowerCase()) {
                                    localStorage.DebugMode = tempSettings[i].SettingValue;
                                    var pluginParamDebugMode = {
                                        "DebugMode": localStorage.DebugMode
                                    }
                                    EchoService.writeLog(EchoService.LEVEL_INFO, "Login", 'DebugMode:' + localStorage.DebugMode);
                                    PhonegapService.setDebugMode(pluginParamDebugMode, function(pluginResponse) {
                                        EchoService.writeLog(EchoService.LEVEL_INFO, "Login", 'Setting DebugMode Response:' + pluginResponse);
    
                                    }, function(error) {
                                        EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'Error setting DebugMode:' + error);
                                    });
                                } else if (tempSettings[i].SettingName.toLowerCase() == "EnableBeaconNotifications".toLowerCase()) {
                                    if (tempSettings[i].SettingValue) {
                                        localStorage.EnableBeaconNotifications = tempSettings[i].SettingValue.toLowerCase();
                                    }
    
                                } else if (tempSettings[i].SettingName.toLowerCase() == "MapboxToken".toLowerCase()) {
    
                                    localStorage.MapboxToken = tempSettings[i].SettingValue;
    
    
                                }
                            }
                            downloadBrandImage(function(path) {
    
                                if (path) {
                                    if (path.length > 0) {
                                        localStorage.loginImagePath = path;
                                    }
                                }
                                var pluginParamMenuItems = {
                                    "url": appConfig.url + "/MenuItems",
                                    "requesttype": "GET",
                                    "authenticationkey": localStorage.authenticationKey,
                                    "params": {}
                                }
    
    
    
    
                                PhonegapService.callWebservice(pluginParamMenuItems, function(pluginResponse) {
                                    try {
                                        var objMenuItems = JSON.parse(pluginResponse);
                                        localStorage.menuItems = JSON.stringify(objMenuItems);
                                        $state.go('main.home');
                                        return;
                                    } catch (error) {
                                        EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'error parsing menu items:' + error);
                                    }
                                }, function(error) {
                                    EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'error retriving menu item from server:' + error);
                                });
                            })
    
                            return;
    
                        } catch (error) {
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'error get settings level-1:' + error);
                            $rootScope.loading = false;
                        }
                    }, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'error  get settings level-2:' + error);
                        $rootScope.loading = false;
                    });
    
    
                    
    
                } catch (error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "Login", 'Login response error-1: ' + error);
                    $rootScope.loading = false;
    
                    var splitresponse = pluginResponse.split(/"/);
                    var splitresponse1 = splitresponse[0];
                    if (splitresponse1 == "Unable to resolve host ") {
                        $translate('label-InternetConnection').then(function(val) {
                            $scope.errMessage = val;
    
                        });
                    } else {
                        $translate('label-InvalidUserNameOrPassword').then(function(val) {
                            $scope.errMessage = val;
    
                        });
                        $scope.password = "";
                    }
                    $rootScope.$apply();
                    //return;
    
                }
                //onError();
                //$rootScope.$apply();
            }, function(error) {
                onError();
                EchoService.writeLog(EchoService.LEVEL_ERROR, 'Login', 'Login response error-2: ' + error);
                $rootScope.loading = false;
            });
        }
    
    
    
        $scope.backPress = function() {
            navigator.app.exitApp();
        }
    
        function downloadBrandImage(callBack) {
            var pluginParam = {
                "url": appConfig.url + "/Branding/Image",
                "requesttype": "GET",
                //"X-LoginSource" : "mobile",
                "authenticationkey": localStorage.authenticationKey,
                "params": {}
            }
    
            PhonegapService.callWebservice(pluginParam, function(response) {
                try {
                    //get DownloadURL
                    //alert(JSON.stringify(response));
                    var obj = JSON.parse(response);
                    var downloadURL = obj.DownloadURL;
                    //alert(JSON.stringify(downloadURL));
    
                    var pluginParam = {
                        "url": downloadURL,
                        "path": appConfig.appFolder + "/Branding"
                    }
                    PhonegapService.callWebserviceHttpDownload(pluginParam, function(respHttp) {
                        //check response status.. if success set the path
                        var resp = JSON.parse(respHttp);
                        var status = obj.status;
    
                        var n = downloadURL.lastIndexOf('/');
                        var fileName = downloadURL.substring(n + 1);
    
                        ConnectSqliteDB.getBrandingStoragePath(function(path) {
                            var path = path + "/" + fileName;
                            callBack(path);
                        });
                    });
                } catch (error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, 'Login', 'downloadBrandImage failed: ' + error);
                    callBack("");
                }
    
            });
        }
    
    }]);
    
    bhvApp.controller('MainController', ['$rootScope', '$location', '$scope', '$state', 'dialogs', 'PhonegapService', 'appConfig', '$interval', '$translate', 'ConnectSqliteDB', 'EchoService', 'CommonService', '$timeout', 'FileSystemService', function($rootScope, $location, $scope, $state, dialogs, PhonegapService, appConfig, $interval, $translate, ConnectSqliteDB, EchoService, CommonService, $timeout, FileSystemService) {
    
        EchoService.writeLog(EchoService.LEVEL_INFO, "MainController: start", "App version:" + appConfig.version);
    
        //for old version fix without version info
        if (localStorage.version == null || CommonService.compareVersion(localStorage.version, appConfig.version)) {
            EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", "Performing version upgrade cleanup:Current version:" + localStorage.version + "\tUpgrading to:" + appConfig.version);
    
            //delete old database which is giving issue somehow
            ConnectSqliteDB.deleteDB(function(response) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'Deleted old version DB response:' + response);
            });
    
            localStorage.clear();
            localStorage.version = appConfig.version;
            $state.go('login');
    
        }
    
        $scope.version = appConfig.version;
        $scope.$watch('heartbeat', function(value) {
            if (value.heartbeatevent) {
                $scope.openHeartBeatDialog(value);
                $scope.openSettingsDisablePopup();
            }
        });
    
    
    
        $rootScope.loading = false;
        $scope.knowledgefilter = false;
        localStorage.removeItem("exitDialogLocationId");
        $rootScope.exitAndLogOffOpened = false;
        $rootScope.alarmBtnCount = 0;
        var beaconArray = [];
    
        $scope.menuHome = false;
        $scope.menuPosition = false;
        $scope.menuCreateCalamity = false;
        $scope.menuMessageList = false;
        $scope.menuKnowledgeBase = false;
        $scope.menuPortal = false;
        $scope.menuClose = false;
        $scope.menuCloseAndLogout = false;
        $scope.menuAvaibilityOverview = false;
        $scope.menuSendDiagnostics = true; //by default true
        $scope.menuAbout = true;
        $scope.translateSendDiagnostics = 'label-SendDiagnostics';
        $scope.translateAvaibilityOverview = 'label-AvaibilityOverview';
        $scope.translateAbout = 'label-About';
    
        $scope.enableBeaconService = false;
        $scope.enableWifiService = false;
    
        if (localStorage.EnableBeaconService == "true") {
            $scope.enableBeaconService = true;
        } else {
            $scope.enableBeaconService = false;
        }
    
        if (localStorage.EnableWifiService == "true") {
            $scope.enableWifiService = true;
        } else {
            $scope.enableWifiService = false;
        }
    
        ConnectSqliteDB.initializeDB(function() {
            //Set beacon Interval
            var pluginparamBeaconInterval = {
                "beaconInterval": localStorage.BeaconInterval,
                "EnableBeaconNotifications": localStorage.EnableBeaconNotifications
            };
    
            PhonegapService.setBeaconInterval(pluginparamBeaconInterval, function(pluginResponse) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'setting BeaconInterval Response:' + pluginResponse);
    
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'setting BeaconInterval error:' + error);
    
            });
            ConnectSqliteDB.syncUserLocations(localStorage.userId, function(pluginResponse) {
                //alert(pluginResponse);
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'ConnectSqliteDB.syncUserLocations...response :' + pluginResponse);
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'enableBeaconService:' + $scope.enableBeaconService);
                //TODO now start beacon service
                var pluginParam = {}
    
                if ($scope.enableBeaconService == true) {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'Beacon Service initialize...');
                    if (localStorage.BeaconInterval == undefined) {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'Setting BeaconInterval to default setting...');
                        localStorage.BeaconInterval = 60;
                    }
    
    
                    beaconsConnect.startBeaconService(pluginParam, function(response) {
                        EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController:", 'bhv is monitoring beacon...');
                    }, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'ERROR ranging beacons' + error);
                    });
                } else {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'Beacon service is disabled');
                }
    
                if ($scope.enableWifiService == true) {
                    //$timeout(function() {
                    //alert("Wifi service...");
                    EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController:", 'Starting Wifi service...');
                    wifiConnect.startWifiService({}, function(response) {}, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'ERROR ranging wifi' + error);
                    });
                    //}, 5000);
    
                } else {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'Wifi service is disabled');
                }
    
            });
        });
    
        $scope.menuPosition = true;
        //$scope.translatePosition = parseMenuArray[i].TranslationCode;
    
        $scope.enableMobileUserStatus = false;
    
    
        if (localStorage.EnableMobileUserStatus == "true") {
            $scope.enableMobileUserStatus = true;
        } else {
            $scope.enableMobileUserStatus = false;
        }
    
    
    
        try {
            var parseMenuArray = JSON.parse(localStorage.menuItems);
            for (var i = 0; i < parseMenuArray.length; i++) {
                if (parseMenuArray[i].MenuName == "Home") {
                    $scope.menuHome = true;
                    $scope.translateHome = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "Position") {
                    $scope.menuPosition = true;
                    $scope.translatePosition = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "Create Calamity" || parseMenuArray[i].MenuName == "CreateCalamity") {
                    $scope.menuCreateCalamity = true;
                    $scope.translateCalamity = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "MessageList") {
                    $scope.menuMessageList = true;
                    $scope.translateMessageList = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "Knowledge Base" || parseMenuArray[i].MenuName == "KnowledgeBase") {
                    $scope.menuKnowledgeBase = true;
                    $scope.translateKnowledgeBase = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "Portal") {
                    $scope.menuPortal = true;
                    $scope.translatePortal = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "Close") {
                    $scope.menuClose = true;
                    $scope.translateClose = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "CloseAndLogout") {
                    $scope.menuCloseAndLogout = true;
                    $scope.translateCloseAndLogout = parseMenuArray[i].TranslationCode;
                } else if (parseMenuArray[i].MenuName == "AvaibilityOverview") {
                    $scope.menuAvaibilityOverview = true;
                    $scope.translateAvaibilityOverview = parseMenuArray[i].TranslationCode;
                }
            }
    
    
        } catch (ex) {
            EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error parsing menu items...' + ex);
            var bluetoothCheckboxChecked = localStorage.bluetoothCheckboxChecked;
            var locationCheckboxChecked = localStorage.locationCheckboxChecked;
            var version = localStorage.version;
            localStorage.clear();
            localStorage.bluetoothCheckboxChecked = bluetoothCheckboxChecked;
            localStorage.locationCheckboxChecked = locationCheckboxChecked;
            localStorage.version = version;
            //navigator.app.exitApp();
            $state.go('login');
            return;
        }
    
        if (localStorage.GeoFencingModeEnable == 'true') {
    
    
            EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Enabling GeoFencingMode in Native:');
            var pluginparamGeoFencingMode = {
                "geoFencingMode": "true"
            };
    
    
            PhonegapService.setGeoFencingMode(pluginparamGeoFencingMode, function(pluginResponse) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'setting GeoFencingMode Response:' + pluginResponse);
    
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'error setGeoFencingMode:' + error);
            });
    
    
        }
    
        $rootScope.$on('updateStatus', function(e, data) {
            //console.log("data = " + (JSON.stringify(data)));
            var stat = data.status;
            console.log("stat=" + JSON.stringify(stat));
            var current = JSON.parse(localStorage.currentStatus);
            if (current.Description == 'Geen dienst' && stat.PersonStatus == 'Standby') {
                if (current.Description != stat.PersonStatus) {
                    try {
                        var tempStatuses = JSON.parse(localStorage.personStatuses);
                        $scope.currentStatus = tempStatuses[0]; //TODO  ???? how come 0 ??
                        localStorage.currentStatus = JSON.stringify($scope.currentStatus);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "updateStatus", 'sendStandByStatus..' + error);
                    }
                }
    
            } else if (stat.PersonStatus == 'Geen dienst') {
                if (current.Description != stat.PersonStatus) {
                    try {
                        var tempStatuses = JSON.parse(localStorage.personStatuses);
                        $scope.currentStatus = tempStatuses[4]; //TODO  ???? how come 0 ??
                        localStorage.currentStatus = JSON.stringify($scope.currentStatus);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "updateStatus", 'sendNotWorkingStatus..' + error);
                    }
                    console.log("second");
    
    
                }
            }
        });
    
        $scope.openSettingsDisablePopup = function() {
            if (localStorage.settingDisabledPopupShown == undefined || localStorage.settingDisabledPopupShown != "true") {
                localStorage.settingDisabledPopupShown = "true";
                openBluetoothPopup();
                openLocationPopup();
            }
    
        }
        $scope.openSettingsDisablePopup();
    
        function openBluetoothPopup() {
    
            if (localStorage.EnableBeaconService == "true" && (localStorage.bluetoothCheckboxChecked == undefined || localStorage.bluetoothCheckboxChecked == "undefined" || localStorage.bluetoothCheckboxChecked == "false")) {
                PhonegapService.getBluetoothStatus(function(pluginResponse) {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", "openBluetoothPopup(): Bluetooth Response: " + pluginResponse);
                    var obj = JSON.parse(pluginResponse);
                    var bluetoothEnabled = obj.BluetoothEnabled;
    
                    if (bluetoothEnabled == 'false') {
                        var data = {};
                        data.name = "bluetooth";
                        var dlg = dialogs.create('views/settingsDisablePopup.html', 'SettingsDisableCtrl', data, {
                            size: 'lg',
                            keyboard: true,
                            backdrop: false,
                            windowClass: 'my-class'
                        });
                        dlg.result.then(function(response) {
    
                        }, function(response) {
    
                        });
                    }
                });
    
            }
        }
    
        function openLocationPopup() {
            if (localStorage.GeoFencingModeEnable == "true" && (localStorage.locationCheckboxChecked == undefined || localStorage.locationCheckboxChecked == "undefined" || localStorage.locationCheckboxChecked == "false")) {
    
                PhonegapService.getLocationStatus(function(pluginResponse) {
    
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", "openLocationPopup(): getLocationStatus Response: " + pluginResponse);
    
                    var obj = JSON.parse(pluginResponse);
    
                    var gpsEnabled = obj.GPSEnabled;
                    var locationMode = obj.LocationMode;
    
                    if (gpsEnabled != 'true' || locationMode != 'LOCATION_MODE_HIGH_ACCURACY') {
                        var data = {};
                        data.name = "location";
                        var dlg = dialogs.create('views/settingsDisablePopup.html', 'SettingsDisableCtrl', data, {
                            size: 'lg',
                            keyboard: true,
                            backdrop: false,
                            windowClass: 'my-class'
                        });
    
                        dlg.result.then(function(response) {
    
                        }, function(response) {
    
                        });
                    }
                });
            }
        }
    
        $scope.openHeartBeatDialog = function(data) {
            var dlg = dialogs.create('views/heartBeatpopUp.html', 'HeartBeatCtrl', data, {
                size: 'lg',
                keyboard: true,
                backdrop: false,
                windowClass: 'my-class'
            });
    
            dlg.result.then(function(response) {
                if (unbindHandler) {
                    unbindHandler();
                }
    
            }, function(response) {
                if (unbindHandler) {
                    unbindHandler();
                }
    
            });
        }
        var unbindHandler = $scope.$on('heartBeaten', function(event, args) {
    
            $scope.openHeartBeatDialog(args.data);
            $scope.openSettingsDisablePopup();
        });
    
    
        function iosPushNotification() {
            var pushNotification = window.plugins.pushNotification;
            pushNotification.register(tokenHandler, errorHandler, { 'badge': 'false', 'sound': 'false', 'alert': 'true', 'ecb': 'onNotificationAPN' });
        }
    
        function tokenHandler(result) {
            var pluginParam = {
                "url": appConfig.url + "/RegisterDevice",
                "requesttype": "POST",
                "authenticationkey": localStorage.authenticationKey,
                "params": {
                    "type": "apple",
                    "registrationkey": result
                }
            }
            PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
    
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'Error Status change-2..' + error);
            });
        }
        // result contains any message sent from the plugin call
        function successHandler(result) {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController:", 'Callback Success! Result = ' + result);
        }
    
        function errorHandler(error) {
            console.log(error);
            EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'Callback error! Result = ' + error);
        }
    
        function onNotificationAPN(event) {
    
            if (event.alert) {
                console.log('onNotificationAPN zzz= ' + event);
            }
    
            if (event.sound) {
                var snd = new Media(event.sound);
                snd.play();
            }
    
            if (event.badge) {
                var pushNotification = window.plugins.pushNotification;
                pushNotification.setApplicationIconBadgeNumber(successHandler, errorHandler, event.badge);
            }
        }
    
        $scope.openfilters = function() {
            $rootScope.$broadcast('openfilter');
        }
    
        $rootScope.$on('showfilter', function(event, args) {
            if (args) {
                if (args.hide) {
                    $scope.knowledgefilter = false;
                }
    
            } else {
                $scope.knowledgefilter = true;
            }
    
        });
    
        $scope.reloadKnowledgeBase = function() {
            $rootScope.$broadcast('reloadKnowledgeBase');
        }
    
    
    
        function sendStandByStatus(callBack) {
            var statusId = CommonService.getPersonStatusIdFromDescription("Standby");
            CommonService.sendPersonStatus(statusId, callBack);
        }
    
        function sendNotWorkingStatus(callBack) {
            var statusId = CommonService.getPersonStatusIdFromDescription("Geen dienst");
            CommonService.sendPersonStatus(statusId, callBack);
        }
    
    
        try {
    
    
    
            var personStatus = JSON.parse(localStorage.currentPersonStatus);
            $scope.currentStatus = personStatus;
            localStorage.currentStatus = localStorage.currentPersonStatus;
    
        } catch (error) {
            if (localStorage.setPersonActiveByDefault == 'true') {
                sendStandByStatus(function(response, guid) {
                    try {
                        var tempStatuses = JSON.parse(localStorage.personStatuses);
                        $scope.currentStatus = tempStatuses[0]; //TODO  ???? how come 0 ??
                        localStorage.currentStatus = JSON.stringify($scope.currentStatus);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'sendStandByStatus..' + error);
                    }
                });
            } else {
    
                var tempStatuses = JSON.parse(localStorage.personStatuses);
                var status = {};
                for (var i = 0; i < tempStatuses.length; i++) {
                    if (tempStatuses[i].Description == "Geen dienst") {
                        status = tempStatuses[i];
                    }
                }
                $scope.currentStatus = status;
                localStorage.currentStatus = JSON.stringify($scope.currentStatus);
    
    
                sendNotWorkingStatus(function(response, guid) {
                    try {
                        var tempStatuses = JSON.parse(localStorage.personStatuses);
                        var status = {};
                        for (var i = 0; i < tempStatuses.length; i++) {
                            if (tempStatuses[i].Description == "Geen dienst") {
                                status = tempStatuses[i];
                            }
                        }
                        $scope.currentStatus = status;
                        localStorage.currentStatus = JSON.stringify($scope.currentStatus);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'sendNotWorkingStatus..' + error);
                    }
                });
            }
    
        }
    
    
    
    
        var pluginParam = {}
    
    
    
        function init() {
            EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", "init() called");
            iosPushNotification();
            var loneworkerAlert = "";
            var pluginParam = {
                "URL": appConfig.url,
                "UserId": localStorage.userId,
                "AuthenticationKey": localStorage.authenticationKey,
                "UserName": localStorage.userName,
                "LocationMode": localStorage.LocationMode,
                "DeviceGPSTimeThreshold": localStorage.DeviceGPSTimeThreshold,
                "DeviceGPSDistanceThreshold": localStorage.DeviceGPSDistanceThreshold
            }
    
            PhonegapService.startService(pluginParam, function(response) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Background service started successfully.');
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error starting background service ' + error);
            });
    
            var pluginMessageParam = {
                "notsent": localStorage.notsent,
                "sent": localStorage.sent,
                "read": localStorage.read
            }
    
            PhonegapService.MessageStatusesservice(pluginMessageParam, function(response) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'MessageStatuses send to java class');
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'MessageStatuses cannot send to java class ' + error);
            });
    
            $rootScope.$on('PhonegapServiceEvent', function(event, jsonMessage) {
    
                var dlg = dialogs.create('views/remark-dialog.html', 'RemarkDialogCtrl', jsonMessage, {
                    size: 'lg',
                    keyboard: true,
                    backdrop: false,
                    windowClass: 'my-class'
                });
    
                dlg.result.then(function(name) {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Remark dialog responded-1');
                }, function() {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Remark dialog responded-2');
                });
            });
    
            $scope.start = function(intDuration) {
                loneworkerAlert = $interval(function() {
                    if ($rootScope.alarmBtnCount == 0 || $rootScope.alarmBtnCount % 2 == 1) {
                        $scope.alarmDialog("init-start()");
                    } else {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Auto alarm bypassed due to alarm count:' + $rootScope.alarmBtnCount);
                    }
                }, 1000 * intDuration);
            };
    
            if (localStorage.isLoneWorkerActive == "true") {
    
                if (localStorage.LoneworkerInterval == undefined) {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Setting loneworker alert interval not defined.. setting to default 300 secs...');
                    localStorage.LoneworkerInterval = 300;
                }
    
                if (localStorage.LoneworkerInterval >= 60) {
                    $scope.start(localStorage.LoneworkerInterval);
                } else {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Invalid Loneworker Interval.. :' + localStorage.LoneworkerInterval + "\t.. using default ..300 secs");
                    $scope.start(300);
                }
            }
    
            $scope.stop = function() {
                $interval.cancel(loneworkerAlert);
            };
    
    
            $state.go('main.home');
    
        }
    
        init();
    
        //set local notification.
        $scope.callNotification = function(beaconParams) {
            var pluginParam = {}
    
            PhonegapService.setLocalNotification(beaconParams, function(response) {
                //EchoService.writeLog(EchoService.LEVEL_INFO ,"MainController" ,'setLocalNotification successfully.');
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error setLocalNotification ' + error);
            });
        }
    
    
        $scope.go = function(route) {
            //$state.go(route, {},{reload: true});
            if (route == 'main.messagelist' && route == $state.current.name) {
                $rootScope.reloadMessageList = true;
            } else {
                $state.go(route);
            }
    
    
    
        }
    
        function showPosition(position) {
            dialogs.notify('GPS locatie', 'Breedtegraad: ' + position.coords.latitude + '<br>' + 'Lengtegraad: ' + position.coords.longitude);
        }
    
        $scope.getLocation = function() { //no network call...only show
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition, function() {
                    $translate('label-GPSInactive').then(function(trans) {
                        dialogs.notify('GPS locatie', trans);
                    });
                });
            } else {
                $translate('label-GPSError').then(function(trans) {
                    dialogs.notify('GPS locatie', trans);
                });
            }
        };
    
        $scope.exitAndLogOffDialog = function(which) {
    
            if ($rootScope.exitAndLogOffOpened == false) {
                $rootScope.exitAndLogOffOpened = true;
    
                $translate('label-TitleExitApp').then(function(transTitle) {
                    $translate('label-LogOffAndExit').then(function(transMessage) {
                        var dlg = dialogs.confirm(transTitle, transMessage);
                        dlg.result.then(function(btn) {
                            $rootScope.exitAndLogOffOpened = false;
                            try {
                                //sendNotWorkingStatus(function(){
                                $scope.logOff(function(response) {
                                    //parse response for any errors...
                                    // if any error then show dialog
                                    response = JSON.parse(response);
                                    if (response != '{}' && response != 'timeout' && response != '{"ResponseCode":"401"}' && response.ResponseCode != 200 && response.Code !== 882001) {
    
                                        $translate('label-NoDataConnectionForLogoff').then(function(transNodataconnection) {
                                            dialogs.notify('BHV', transNodataconnection);
                                        });
                                    } else {
    
                                        //pushNotification.unregister(successHandler, errorHandler, options);
                                        var bluetoothCheckboxChecked = localStorage.bluetoothCheckboxChecked;
                                        var locationCheckboxChecked = localStorage.locationCheckboxChecked;
                                        var version = localStorage.version;
                                        var imagePath = localStorage.loginImagePath;
                                        localStorage.clear();
                                        localStorage.bluetoothCheckboxChecked = bluetoothCheckboxChecked;
                                        localStorage.locationCheckboxChecked = locationCheckboxChecked;
                                        localStorage.version = version;
                                        localStorage.loginImagePath = imagePath;
                                        $scope.stop();
    
                                        var pluginParam = {}
                                        beaconsConnect.stopBeaconService(pluginParam, function(response) {
                                            EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'Successfully stopped beacons' + response);
                                        }, function(error) {
                                            EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'ERROR stoping beacons' + error);
                                        });
    
                                        wifiConnect.stopWifiService(pluginParam, function(response) {
                                            EchoService.writeLog(EchoService.LEVEL_INFO, "MainController:", 'Successfully stopped wifi service' + response);
                                        }, function(error) {
                                            EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController:", 'ERROR stoping wifi service' + error);
                                        });
    
    
                                        PhonegapService.stopService("Stopping phonegap service", function() {
                                            //navigator.app.exitApp();
    
                                        }, function() {
                                            //navigator.app.exitApp();
    
                                        });
                                        $state.go('login');
                                    }
                                });
                                //});
                            } catch (error) {
                                EchoService.writeLog(EchoService.LEVEL_ERROR, "Main", 'Cordova ERROR:' + 'exitDialog' + error);
                                navigator.app.exitApp();
                            }
                        }, function(btn) {
                            $rootScope.exitAndLogOffOpened = false;
                        });
                    });
                });
    
            }
    
        };
    
        $scope.exitDialog = function() {
            localStorage.settingDisabledPopupShown = "false";
            //sendNotWorkingStatus();
            localStorage.currentStatus = '';
    
            PhonegapService.setNotificationMessage(function(messageDetails) {
                var pluginParam = {};
    
            });
            navigator.app.exitApp();
        };
    
        //TODO logoff error change
        $scope.logOff = function(callBack) {
                                          $rootScope.loading = true;
            var pluginParam = {
                "url": appConfig.url + "/Logout",
                "requesttype": "PUT",
                "authenticationkey": localStorage.authenticationKey,
                "params": {}
            }
            PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                try {
                    EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController", 'User logoff response: ' + pluginResponse);
                    //var objLogOutResponse = JSON.parse(pluginResponse);			
                    callBack(pluginResponse);
                } catch (error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error User loggout out...' + error);
                    callBack(error);
                }
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error User loggout out-2..' + error);
                callBack(error);
            });
        }
    
        //++++++++++++++LONE WORKER+++++++++++++++++++++++++++++++
        function webserviceLoneWorkerMessage(status, latitude, longitude, timestamp, accuracy) {
            var paramLoneWorkerMessage = {};
            if (latitude == undefined || longitude == undefined) {
                paramLoneWorkerMessage = {
                    "url": appConfig.url + "/LoneWorkerData",
                    "requesttype": "POST",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Status": status
                    }
                }
            } else {
                paramLoneWorkerMessage = {
                    "url": appConfig.url + "/LoneWorkerData",
                    "requesttype": "POST",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Latitude": latitude,
                        "Longitude": longitude,
                        "Status": status,
                        "GPSTimeStamp": timestamp != undefined ? timestamp : "",
                        "Accuracy": accuracy != undefined ? accuracy : ""
                    }
                }
            }
    
    
            PhonegapService.callWebservice(paramLoneWorkerMessage, function(pluginResponse) {
                try {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'sendLoneWorkerMessage sent successfully..' + pluginResponse);
                } catch (error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'sendLoneWorkerMessage sent error..' + error);
                }
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error sendLoneWorkerMessage()..' + error);
            });
        }
    
    
        function sendLoneWorkerMessage(status) {
            if (localStorage.GeoFencingModeEnable == "true") {
                console.log("getGPSLocation():sendLoneWorkerMessage");
                CommonService.getGPSLocation(function(latitude, longitude, timestamp, accuracy) {
                    webserviceLoneWorkerMessage(status, latitude, longitude, timestamp, accuracy);
                });
            } else {
                webserviceLoneWorkerMessage(status, undefined, undefined, undefined, undefined);
            }
        }
    
    
        $scope.alarmDialog = function(which) {
            var dlg = dialogs.create('views/alarm-dialog.html', 'AlarmDialogCtrl', {}, {
                size: 'lg',
                keyboard: true,
                backdrop: false,
                windowClass: 'my-class'
            });
            dlg.result.then(function(response) {
                sendLoneWorkerMessage("NOT OK");
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Alarm dialog responded-NOT OK' + response);
            }, function(response) {
                sendLoneWorkerMessage("OK");
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Alarm dialog responded-OK' + response);
    
            });
        };
    
        //+++++++++++++++++++++++++++++++++++++++++++++
    
        $scope.currentStatus = "";
        if (localStorage.currentStatus != null && localStorage.currentStatus.length > 0) {
            $scope.currentStatus = JSON.parse(localStorage.currentStatus);
        } else {
            try {
                var tempStatuses = JSON.parse(localStorage.personStatuses);
                $scope.currentStatus = tempStatuses[0];
                localStorage.currentStatus = JSON.stringify($scope.currentStatus);
            } catch (error) {
                console.log("Error parsing person status:" + error + "\n" + localStorage.personStatuses);
            }
    
        }
    
        $scope.openUserStatus = function() {
            var dlg = dialogs.create('views/person-status-dialog.html', 'PersonStatusDialogCtrl', {}, {
                size: 'lg',
                keyboard: false,
                backdrop: true,
                windowClass: 'my-class'
            });
            dlg.result.then(function(resultStatus) {
                $scope.currentStatus = resultStatus;
                localStorage.currentStatus = JSON.stringify($scope.currentStatus);
            }, function(reason) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Person status available:' + reason);
    
            });
        };
    
        $scope.openPortal = function() {
            if (localStorage.authenticationKey != null && localStorage.authenticationKey.length > 0) {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController", 'Opening portal...');
                var url = encodeURIComponent(appConfig.portal + "/" + localStorage.authenticationKey + "/" + localStorage.locale);
    
    
                $state.go("main.portalIframe", { 'url': url });
                /*PhonegapService.openBrowser(appConfig.portal + "/" + localStorage.authenticationKey + "/");*/
            } else {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Opening portal failed...check authtentication');
            }
    
        };
    
        $scope.createCalamity = function() {
            if (localStorage.authenticationKey != null && localStorage.authenticationKey.length > 0) {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController", 'Opening portal...');
                var url = encodeURIComponent(appConfig.portalCalamity + "/" + localStorage.authenticationKey + "/" + localStorage.locale);
                $state.go("main.calamityIframe", { 'url': url });
                //PhonegapService.openBrowser(appConfig.portalCalamity + "/" + localStorage.authenticationKey);
            } else {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Opening portal failed...check authtentication');
            }
    
        };
        $scope.availablePersonnel = function() {
            if (localStorage.authenticationKey != null && localStorage.authenticationKey.length > 0) {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController", 'Opening portal...');
                var url = encodeURIComponent(appConfig.availabiltyPersonnel + "/" + localStorage.authenticationKey + "/" + localStorage.locale);
                $state.go("main.AvailablePersonnelIframe", { 'url': url });
                //PhonegapService.openBrowser(appConfig.availabiltyPersonnel + "/" + localStorage.authenticationKey);
            } else {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Opening portal failed...check authtentication');
            }
    
        };
    
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "MainController", 'BackPressed: MainController');
        };
    
        $scope.openDiagnosticsDialog = function() {
            var dlg = dialogs.create('views/send-diagnostic-dialog.html', 'SendDiagnosticDialogCtrl', {}, {
                size: 'lg',
                keyboard: false,
                backdrop: true,
                windowClass: 'my-class'
            });
    
            dlg.result.then(function(logsDays) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Sending diagnostics:' + logsDays);
                if (logsDays != null && logsDays != undefined) {
                    //response have no. of days..
    
                    var pluginParamDiagnostics = {
                        "logsFolder": appConfig.appFolder + "/Logs",
                        "days": logsDays
                    }
                    EchoService.emailDiagnostics(pluginParamDiagnostics, function() {}, function() {});
    
                } else {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MainController", 'Error sending diagnostics ..invalid log days');
                }
            }, function(response) {
                EchoService.writeLog(EchoService.LEVEL_INFO, "MainController", 'Sending diagnostics cancelled');
    
            });
    
    
    
        };
    
    }]);
    
    bhvApp.controller('SendDiagnosticDialogCtrl', ['$scope', '$modalInstance', 'data', 'EchoService', function($scope, $modalInstance, data, EchoService) {
        EchoService.writeLog(EchoService.LEVEL_DEBUG, "SendDiagnosticDialogCtrl:", 'SendDiagnosticDialogCtrl called:');
    
    
    
        $scope.ok = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "SendDiagnostic", 'SendDiagnosticDialogCtrl ok pressed:');
            $modalInstance.close($scope.selectedNoOfDays); //value returned from submit..
    
        }
    
        $scope.cancel = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "SendDiagnosticDialogCtrl:", 'SendDiagnosticDialogCtrl cancel pressed:');
            $modalInstance.dismiss('');
        }
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "SendDiagnosticDialogCtrl:", 'SendDiagnosticDialogCtrl backPress pressed:');
            $modalInstance.dismiss('');
        };
    
    }]);
    
    
    bhvApp.controller('AlarmDialogCtrl', ['$scope', '$modalInstance', 'data', 'EchoService', function($scope, $modalInstance, data, EchoService) {
        $scope.user = {};
    
        $scope.alive = function() {
            $modalInstance.dismiss('OK');
        };
    
        $scope.sendAlarm = function() {
            $modalInstance.close('NOT OK');
        };
    
        $scope.backPress = function() {
            $modalInstance.dismiss('OK');
        };
    
    }]);
    
    bhvApp.controller('PersonStatusDialogCtrl', ['$rootScope', '$scope', '$modalInstance', 'data', 'PhonegapService', 'appConfig', 'EchoService', 'CommonService', '$filter', function($rootScope, $scope, $modalInstance, data, PhonegapService, appConfig, EchoService, CommonService, $filter) {
        $scope.personStatuses = JSON.parse(localStorage.personStatuses);
        $scope.selectedStatus = {};
    
        $scope.pickedStatus = null;
    
        $scope.currentLocalStatus = JSON.parse(localStorage.currentStatus);
        //init checkboxes..all to false..
        for (var i = 0; i < $scope.personStatuses.length; i++) {
    
            if ($scope.currentLocalStatus.PersonStatusId == $scope.personStatuses[i].PersonStatusId) {
                $scope.selectedStatus[$scope.personStatuses[i].PersonStatusId] = true;
                $scope.pickedStatus = $scope.personStatuses[i];
            } else {
                $scope.selectedStatus[$scope.personStatuses[i].PersonStatusId] = false;
            }
        }
        //end
    
        $scope.selectStatus = function(eachStatus) {
            $scope.pickedStatus = eachStatus;
            //$scope.selectedStatus[eachStatus.PersonStatusId] = !$scope.selectedData[eachStatus.PersonStatusId];
            angular.forEach($scope.selectedStatus, function(value, key) {
                if (key == eachStatus.PersonStatusId) {
                    $scope.selectedStatus[key] = true;
                } else {
                    $scope.selectedStatus[key] = false;
                }
            });
        }
    
        $scope.ok = function() {
            CommonService.sendPersonStatus($scope.pickedStatus.PersonStatusId, function(response) {
                //EchoService.writeLog(EchoService.LEVEL_INFO ,"PersonStatusDialogCtrl:" ,'Error Status change-2..' + error);
                var tempResponse = JSON.parse(response);
                var repsCode = tempResponse.ResponseCode;
                var overviewAvaibility = tempResponse.Message.IsAvailable;
                if (repsCode == 200 || respCode == 204) { //success
    
                    if (localStorage.LocationMode.toLowerCase().indexOf('wifi') != -1 || localStorage.LocationMode.toLowerCase().indexOf('beacon') != -1) {
                        //incase user selected Geen dienst.. clear the location state..and if available again, restore state from server...
                        var notAvailableStatus = CommonService.getStatusFromDescription("Geen dienst");
                        if (notAvailableStatus.PersonStatusId == $scope.pickedStatus.PersonStatusId) {
                            //Selected not available status
                            var locationStateParam = {
                                "IsInsideBuilding": false,
                                "CurrentLocation": "",
                                "ParentLocation": "",
                                "Status": ""
                            }
                            if (localStorage.LocationMode.toLowerCase().indexOf('beacon') != -1) {
                                PhonegapService.updateLocationStateBeacon(locationStateParam, function() {}, function() {});
                            } else {
                                PhonegapService.updateLocationStateWifi(locationStateParam, function() {}, function() {});
                            }
                            $rootScope.ErrorMessage = '';
                            $modalInstance.close($scope.pickedStatus);
                        } else {
                            CommonService.getCurrentLocation(function(response) { //get person location and set the status accordingly....
    
                                try {
                                    var locationDetails = JSON.parse(response);
    
                                    var isEntranceExit = locationDetails.IsEntraceOrExit;
                                    var currentLocation = locationDetails.LocationId;
                                    var parentLocation = locationDetails.ParentLocationId;
    
    
                                    var locationStateParam = {
                                            "IsInsideBuilding": true,
                                            "CurrentLocation": currentLocation,
                                            "ParentLocation": parentLocation,
                                            "Status": $scope.pickedStatus.Description
                                        }
                                        //check here..
                                    if (localStorage.LocationMode.toLowerCase().indexOf('beacon') != -1) {
                                        PhonegapService.updateLocationStateBeacon(locationStateParam, function() {}, function() {});
                                    } else {
                                        PhonegapService.updateLocationStateWifi(locationStateParam, function() {}, function() {});
                                    }
                                    $rootScope.ErrorMessage = '';
                                    $modalInstance.close($scope.pickedStatus);
    
                                } catch (error) {
                                    $rootScope.ErrorMessage = $filter('translate')('label-statusUpdate');
                                }
                            });
                        }
                    } else {
                        $scope.ErrorMessage = '';
                        $modalInstance.close($scope.pickedStatus);
                    }
    
    
                    PhonegapService.setPersonStatusBackground(overviewAvaibility);
                } else {
                    $rootScope.ErrorMessage = $filter('translate')('label-statusUpdate');
                }
    
                //TODO need some changes here
                //in case of error .. display the message and set the checkbox value to prev one....
            });
        }
    
        $scope.cancel = function() {
            $modalInstance.dismiss('');
        }
    
        $scope.backPress = function() {
            $modalInstance.dismiss('');
        };
    
    }]);
    
    bhvApp.controller('PersonLocationMapCtrl', ['$state', '$scope', 'EchoService', 'CommonService', function($state, $scope, EchoService, CommonService) {
    
    
        //alert("maps running");
        var mysrclat = 52.373131;
        var mysrclong = 4.892656;
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib = 'Map data � <a href="https://osm.org/copyright">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {
            attribution: osmAttrib,
            detectRetina: true
        });
    
        var token = 'pk.eyJ1IjoicHJvY2l0IiwiYSI6ImNqNDl1cTdwODB2YzEzM3BnbHduN3Z3dnIifQ.-ST_-Stu4vkTYJ0ZoA-bEA';
        if (localStorage.MapboxToken != undefined && localStorage.MapboxToken != null && localStorage.MapboxToken.length > 0) {
            token = localStorage.MapboxToken;
        }
        var mapboxUrl = 'https://api.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token=' + token;
        var mapboxAttrib = 'Map data � <a href="https://osm.org/copyright">OpenStreetMap</a> contributors. Tiles from <a href="https://www.mapbox.com">Mapbox</a>.';
        var mapbox = new L.TileLayer(mapboxUrl, {
            attribution: mapboxAttrib
        });
    
        console.log("getGPSLocation():PersonLocationMapCtrl");
        CommonService.getGPSLocation(function(latitude, longitude, timestamp, accuracy) {
            if (latitude != "" && longitude != "") {
                mysrclat = latitude;
                mysrclong = longitude;
            } else {
                EchoService.writeLog(EchoService.LEVEL_INFO, "PersonLocationMapCtrl:", 'Using default location in map');
            }
    
            var map = new L.Map('map', {
                layers: [mapbox],
                center: [mysrclat, mysrclong],
                zoom: 16,
                zoomControl: true
            });
    
            L.marker([mysrclat, mysrclong]).addTo(map);
    
            lc = L.control.locate({
                follow: true,
                drawCircle: false,
                strings: {
                    title: "I'am here"
                },
                stopFollowingOnDrag: false,
                remainActive: false
            }).addTo(map);
    
            map.on('startfollowing', function() {
                map.on('dragstart', lc._stopFollowing, lc);
            }).on('stopfollowing', function() {
                map.off('dragstart', lc._stopFollowing, lc);
            });
    
            //var lc = L.control.locate().addTo(map);
            //map.on('dragstart', lc._stopFollowing, lc);
        });
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "PersonLocationMapCtrl:", 'Back pressed: PersonLocationMapCtrl');
            $state.go('main.home');
        };
    }]);
    
    // Please note that $modalInstance represents a modal window (instance)
    // dependency.
    // It is not the same as the $modal service used above.
    
    bhvApp.controller('ModalInstanceCtrl', ['$scope', '$modalInstance', 'items', 'EchoService', function($scope, $modalInstance, items, EchoService) {
    
        $scope.items = items;
        $scope.selected = {
            item: $scope.items[0]
        };
    
        $scope.ok = function() {
            $modalInstance.close($scope.selected.item);
        };
    
        $scope.cancel = function() {
            $modalInstance.dismiss('cancel');
        };
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "ModalInstanceCtrl:", 'BackPress: ModalInstanceCtrl');
        };
    }]);
    
    bhvApp.controller('HomeController', ['$rootScope', '$scope', '$state', '$translate', 'PhonegapService', 'dialogs', 'appConfig', '$location', 'EchoService', 'CommonService', 'FileSystemService', function LoginController($rootScope, $scope, $state, $translate, PhonegapService, dialogs, appConfig, $location, EchoService, CommonService, FileSystemService) {
    
        $scope.alarmStatus = "";
    
    
    
        if (localStorage.isLoneWorkerActive == "true") {
            $scope.isLoneWorkerActive = true;
        } else {
            $scope.isLoneWorkerActive = false;
        }
    
        if (localStorage.isLoneWorkerActive == "true") {
            $translate('label-LoneworkerAlarmActive').then(function(trans) {
                $scope.alarmStatus = trans;
            });
        } else {
            $translate('label-LoneworkerDisabledMsg').then(function(trans) {
                $scope.alarmStatus = trans;
            });
        }
    
        function webserviceLoneWorkerMessage(status, latitude, longitude, timestamp, accuracy) {
            var paramLoneWorkerMessage = {};
            if (latitude == undefined || longitude == undefined) {
                paramLoneWorkerMessage = {
                    "url": appConfig.url + "/LoneWorkerData",
                    "requesttype": "POST",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Status": status
                    }
                }
            } else {
                paramLoneWorkerMessage = {
                    "url": appConfig.url + "/LoneWorkerData",
                    "requesttype": "POST",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Latitude": latitude,
                        "Longitude": longitude,
                        "Status": status,
                        "GPSTimeStamp": timestamp != undefined ? timestamp : "",
                        "Accuracy": accuracy != undefined ? accuracy : ""
                    }
                }
            }
    
    
            PhonegapService.callWebservice(paramLoneWorkerMessage, function(pluginResponse) {
                try {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "HomeController:", 'sendLoneWorkerMessage sent successfully..' + pluginResponse);
                } catch (error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "HomeController:", 'sendLoneWorkerMessage sent error..' + error);
                }
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "HomeController:", 'Error sendLoneWorkerMessage()..' + error);
            });
        }
    
    
        function sendLoneWorkerMessage(status) {
            if (localStorage.GeoFencingModeEnable == "true") {
                console.log("getGPSLocation():sendLoneWorkerMessage");
                CommonService.getGPSLocation(function(latitude, longitude, timestamp, accuracy) {
                    webserviceLoneWorkerMessage(status, latitude, longitude, timestamp, accuracy);
                });
            } else {
                webserviceLoneWorkerMessage(status, undefined, undefined, undefined, undefined);
            }
        }
    
    
        $scope.alarmDialog = function(which) {
    
    
            if (localStorage.isLoneWorkerActive == "true") {
    
                if ($rootScope.alarmBtnCount == 0) {
                    var dlg = dialogs.create('views/alarm-dialog.html', 'AlarmDialogCtrl', {}, {
                        size: 'lg',
                        keyboard: true,
                        backdrop: false,
                        windowClass: 'my-class'
                    });
                    dlg.result.then(function(response) {
                        sendLoneWorkerMessage("NOT OK");
                        EchoService.writeLog(EchoService.LEVEL_INFO, "HomeController:", 'Alarm dialog responded-NOT OK' + response);
                    }, function(response) {
                        sendLoneWorkerMessage("OK");
                        EchoService.writeLog(EchoService.LEVEL_INFO, "HomeController:", 'Alarm dialog responded-OK' + response);
    
                    });
    
                } else {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "HomeController:", 'Alarm dialog button pressed:..alarm already started once...current button count:' + $rootScope.alarmBtnCount + 1);
                }
    
                $rootScope.alarmBtnCount++;
    
                if ($rootScope.alarmBtnCount == 1) {
                    $translate('label-LoneworkerAlarmPassed').then(function(trans) {
                        $scope.alarmStatus = trans;
                    });
                } else if ($rootScope.alarmBtnCount % 2 == 0) {
                    $translate('label-LoneworkerAlarmNotActive').then(function(trans) {
                        $scope.alarmStatus = trans;
                    });
                } else if ($rootScope.alarmBtnCount % 2 == 1) {
                    $translate('label-LoneworkerAlarmActive').then(function(trans) {
                        $scope.alarmStatus = trans;;
                    });
                }
    
    
            } else {
                /*$translate('label-Loneworker').then(function(transLoneWorker){
                    $translate('label-LoneworkerDisabledMsg').then(function(transLoneWorkerDisabled){
                        dialogs.notify(transLoneWorker, transLoneWorkerDisabled);
                    });
                });	*/
            }
        };
    
        $scope.exitDialog = function() {
    
            localStorage.settingDisabledPopupShown = "false";
            //sendNotWorkingStatus();
            localStorage.currentStatus = '';
            PhonegapService.setNotificationMessage(function(messageDetails) {
                var pluginParam = {};
                /*beaconsConnect.stopBeaconService(pluginParam,function(response){
                    
                },function(error){
                    EchoService.writeLog(EchoService.LEVEL_ERROR ,"HomeController:" ,'ERROR stoping beacons' + error);
                });*/
            });
            navigator.app.exitApp();
        };
    
        $scope.exitAndLogOffDialog = function(which) {
            if ($rootScope.exitAndLogOffOpened == false) {
                $rootScope.exitAndLogOffOpened = true;
    
    
                $translate('label-LoneworkerAlarmActive').then(function(transTitle) {
                    $translate('label-LoneworkerAlarmActive').then(function(transMessage) {
                        var dlg = dialogs.confirm(transTitle, transMessage);
                        dlg.result.then(function(btn) {
                            $rootScope.exitAndLogOffOpened = false;
                            try {
                                //sendNotWorkingStatus(function(){
                                $scope.logOff(function(response) {
                                    response = JSON.parse(response);
                                    //var error = false;
                                    //parse response for any errors...
                                    // if any error then show dialog
                                    if (response != '{}' && response != 'timeout' && response != '{"ResponseCode":"401"}' && response.ResponseCode !== 882001) {
    
                                        $translate('label-NoDataConnectionForLogoff').then(function(transNodataconnection) {
                                            dialogs.notify('BHV', transNodataconnection);
                                        });
                                    } else {
    
                                        //pushNotification.unregister(successHandler, errorHandler, options);
                                        var bluetoothCheckboxChecked = localStorage.bluetoothCheckboxChecked;
                                        var locationCheckboxChecked = localStorage.locationCheckboxChecked;
                                        var version = localStorage.version;
                                        var imagePath = localStorage.loginImagePath;
                                        localStorage.clear();
                                        localStorage.bluetoothCheckboxChecked = bluetoothCheckboxChecked;
                                        localStorage.locationCheckboxChecked = locationCheckboxChecked;
                                        localStorage.version = version;
                                        localStorage.loginImagePath = imagePath;
    
                                        var pluginParam = {}
                                        beaconsConnect.stopBeaconService(pluginParam, function(response) {
                                            EchoService.writeLog(EchoService.LEVEL_INFO, "HomeController:", 'Successfully stopped beacons' + response);
                                        }, function(error) {
                                            EchoService.writeLog(EchoService.LEVEL_ERROR, "HomeController:", 'ERROR stoping beacons' + error);
                                        });
    
                                        wifiConnect.stopWifiService(pluginParam, function(response) {
                                            EchoService.writeLog(EchoService.LEVEL_INFO, "HomeController:", 'Successfully stopped wifi service' + response);
                                        }, function(error) {
                                            EchoService.writeLog(EchoService.LEVEL_ERROR, "HomeController:", 'ERROR stoping wifi service' + error);
                                        });
    
    
                                        PhonegapService.stopService("Stopping phonegap service", function() {
                                            //navigator.app.exitApp();
    
                                        }, function() {
                                            //navigator.app.exitApp();
    
                                        });
                                        $state.go('login');
                                    }
                                });
                                //});
                            } catch (error) {
                                EchoService.writeLog(EchoService.LEVEL_ERROR, "HomeController:", 'Cordova ERROR:' + 'exitDialog' + error);
                                navigator.app.exitApp();
                            }
                        }, function(btn) {
                            $rootScope.exitAndLogOffOpened = false;
                        });
                    });
                });
    
    
            }
        };
    
        $scope.backPress = function() {
            $scope.exitDialog();
        };
    
        function sendStandByStatus(callBack) {
            var statusId = "";
            var tempStandByStatus = JSON.parse(localStorage.personStatuses);
            for (var i = 0; i < tempStandByStatus.length; i++) {
                if (tempStandByStatus[i].Description == "Standby") {
                    statusId = tempStandByStatus[i].PersonStatusId;
                }
            }
            CommonService.sendPersonStatus(statusId, callBack);
        }
    
        function sendNotWorkingStatus(callBack) {
            var statusId = "";
            var tempStatuses = JSON.parse(localStorage.personStatuses);
            for (var i = 0; i < tempStatuses.length; i++) {
                if (tempStatuses[i].Description == "Geen dienst") {
                    statusId = tempStatuses[i].PersonStatusId;
                }
            }
            CommonService.sendPersonStatus(statusId, callBack);
        }
    }]);
    
    bhvApp.controller('CalamityCtrl', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', '$translate', 'EchoService', '$timeout', '$window', 'CommonService',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, $translate, EchoService, $timeout, $window, CommonService) {
    
            var objJson = decodeURIComponent($stateParams.messageDetails);
            $translate('label-provideRemarks').then(function(val) {
                $scope.calamityRemarksPlaceholder = val;
            });
            //send GPS co-ordinates if Location Mode is geo fence
            if (localStorage.GeoFencingModeEnable == "true") {
                CommonService.getGPSLocation(function(latitude, longitude, timestamp, accuracy) {
                    var pluginParamSendGPS = {
                        "url": appConfig.url + "/Persons",
                        "requesttype": "PATCH",
                        "authenticationkey": localStorage.authenticationKey,
                        "params": {
                            "Latitude": latitude,
                            "Longitude": longitude,
                            "GPSTimeStamp": timestamp != undefined ? timestamp : "",
                            "Accuracy": accuracy != undefined ? accuracy : ""
                        }
                    }
    
                    PhonegapService.callWebservice(pluginParamSendGPS, function(pluginResponse) {
                        try {
                            EchoService.writeLog(EchoService.LEVEL_INFO, "CalamityCtrl: Send GPS response:", pluginResponse);
                            var tempResponse = JSON.parse(pluginResponse);
                            var repsCode = tempResponse.ResponseCode;
                            var overviewAvaibility = tempResponse.Message.IsAvailable;
    
                            PhonegapService.setPersonStatusBackground(overviewAvaibility);
                        } catch (error) {
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error Sending GPS..' + error);
                        }
                    }, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error Sending GPS-2..' + error);
                    });
                });
            }
    
            $scope.calamityRemarks = "";
            $scope.calamityDetails = {};
            $scope.isCallInProgress = false;
            $scope.isActionCompleted = false;
    
            $scope.notificationTitle = "BHV";
    
            //$scope.user = objJson.Message.User;
            var obj = JSON.parse(objJson);
            var message = obj.Message;
            var calamityParse;
            if (typeof message === 'string') {
                calamityParse = JSON.parse(obj.Message);
            } else {
                calamityParse = obj.Message;
            }
    
            $scope.actionId = calamityParse.ActionId;
            $scope.actionDetailId = calamityParse.ActionDetailId;
            $scope.calamityDetails.CalamityId = calamityParse.CalamityId;
            $scope.calamityDetails.useConferenceCalls = calamityParse.UseConferenceCalls;
            $scope.calamityDetails.ActionDateTime = calamityParse.ActionDateTime;
            $scope.LocationName = calamityParse.LocationName;
            $scope.Accepted = calamityParse.Accepted;
            $scope.calamityRemarks = calamityParse.Message || '';
            $scope.calamityDetails.CalamityDescription = calamityParse.CalamityDescription;
            $scope.calamityDetails.isActionCompleted = calamityParse.IsActionCompleted; //update ios
            //alert($scope.calamityDetails.CalamityDescription);
    
            $scope.handleCompletedCalamity = function() {
                $translate('label-CalamityHandled').then(function(transCalamityHandled) {
                    var dlg = dialogs.notify('BHV', transCalamityHandled);
                    dlg.result.then(function(btn) {
                        $scope.closeAction();
                    });
                });
            }
    
            if ($scope.calamityDetails.isActionCompleted) {
                $scope.handleCompletedCalamity();
            }
    
            $scope.closeAction = function() {
                $state.go('main.home');
            }
    
    
            $scope.reject = function() {
                sendNotificationResponseCalamity('REJECTED', function(response) {
                    //check if calamity is already completed by colleuge...
                    if (response == true) { //calamity alredy completed....
                        $scope.handleCompletedCalamity();
                        return;
                    }
                    $state.go('main.home');
                });
    
            }
    
            $scope.accept = function() {
                sendNotificationResponseCalamity('ACCEPTED', function(response) {
    
                    if (response == true) { //calamity alredy completed....
                        $scope.handleCompletedCalamity();
                        return;
                    }
    
                    if ($scope.calamityDetails.useConferenceCalls) {
    
    
    
                        $translate('label-JoinConferenceCall').then(function(transResult) {
                            var dlg = dialogs.confirm('Portofoon', transResult);
                            dlg.result.then(function(btn) {
                                EchoService.writeLog(EchoService.LEVEL_INFO, "CalamityCtrl:", 'Initiating conference call function...');
    
                                PhonegapService.getCallState(function(callState) {
                                    if (callState == "CALL_STATE_IDLE") {
                                        $scope.isCallInProgress = true;
    
                                        var pluginParam = {
                                            "url": appConfig.url + "/ConferenceCallProviders",
                                            "requesttype": "PATCH",
                                            "authenticationkey": localStorage.authenticationKey,
                                            "params": {
                                                "actionId": $scope.actionId,
                                                "action": "startcall"
                                            }
                                        }
    
                                        EchoService.writeLog(EchoService.LEVEL_INFO, "CalamityCtrl:", 'Checking for conference call...');
                                        PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                                            try {
                                                EchoService.writeLog(EchoService.LEVEL_INFO, "CalamityCtrl:", 'Received response from ConferenceCallProviders()');
                                                var tempParam = JSON.parse(pluginResponse);
                                                //if no response..assume no phonelines are available...handled by catch statement..
    
                                                //add url and authentication key to conference call as this will be used to send buzz message from native...
                                                tempParam.url = appConfig.url + "/BuzzerMessages";
                                                tempParam.requesttype = "POST";
                                                tempParam.authenticationkey = localStorage.authenticationKey;
                                                tempParam.params = {
                                                    "actionId": $scope.actionId
                                                };
    
                                                var sendParam = JSON.stringify(tempParam);
    
    
                                                PhonegapService.conferenceCall(sendParam, function(conferenceCallResp) {
    
                                                    var pluginParam = {
                                                        "url": appConfig.url + "/ConferenceCallProviders",
                                                        "requesttype": "PATCH",
                                                        "authenticationkey": localStorage.authenticationKey,
                                                        "params": {
                                                            "actionId": $scope.actionId,
                                                            "action": "endcall"
                                                        }
                                                    }
                                                    PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                                                        EchoService.writeLog(EchoService.LEVEL_INFO, "CalamityCtrl:", 'Success ConferenceCallProviders(endcall)');
                                                        $state.go('main.home');
    
                                                    }, function(error) {
                                                        EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error calling ConferenceCallProviders(endcall):ERROR:' + error);
                                                        $state.go('main.home');
                                                    });
    
                                                }, function(error) {
                                                    EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error calling conferenceCall():ERROR:' + error);
                                                    $state.go('main.home');
                                                });
    
                                            } catch (error) {
                                                EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error parsing ConferenceCallProviders(startcall)..response...:ERROR:' + error);
                                                //show dialog...
                                                $translate('label-AllPortsBusy').then(function(transResult) {
                                                    dialogs.notify('BHV', transResult);
                                                    $state.go('main.home');
                                                });
    
                                            }
    
                                        }, function(error) {
                                            EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error in checking for ConferenceCallProviders(startcall):ERROR:' + error);
                                            $state.go('main.home');
                                        });
    
                                    } else {
                                        $translate('label-CallInProgress').then(function(transResult) {
                                            dialogs.notify('BHV', transResult);
                                        });
                                    }
                                });
    
                            }, function(btn) {
                                $state.go('main.home');
                            });
                        });
    
    
    
    
    
                    } else {
                        $state.go('main.home');
                    }
                });
            }
    
            $scope.openlocation = function() {
                $state.go("locationmap");
            }
    
            function sendNotificationResponseCalamity(statusId, callBack) {
    
                //var accessDetails = window.JSInterface.getAccessDetails();
                //var jsonAccessDetails = JSON.parse(accessDetails);
                //var messageDetails = window.JSInterface.getNotficationDetails();
                //var jsonMessageDetails = JSON.parse(messageDetails);
    
                var pluginParam = {
                    "url": appConfig.url + "/AndroidMessages",
                    "requesttype": "POST",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "ActionId": $scope.actionId,
                        "ActionDetailId": $scope.actionDetailId,
                        "ActionDetailStatusId": statusId,
                        "Message": $scope.calamityRemarks,
                        "MessageDateTime": new moment().format(),
                        "MessageId": ""
                    }
                }
    
                PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "CalamityCtrl:", 'sendNotificationResponseCalamity sent successfully..' + pluginResponse);
                    try {
                        var objJson = JSON.parse(pluginResponse);
                        callBack(objJson.IsActionCompleted);
                    } catch (error) {
    
                    }
    
    
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "CalamityCtrl:", 'Error sendNotificationResponseCalamity()..' + error);
                    callBack(false); //if error in update..send action completed as false
                });
            }
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "CalamityCtrl:", 'BackPress: CalamityCtrl');
                $state.go('main.home');
            };
    
        }
    ]);
    
    bhvApp.controller('LoneWorkerCtrl', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', 'EchoService', 'CommonService',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, EchoService, CommonService) {
    
            //send GPS co-ordinates if Location Mode is geo fence
            if (localStorage.GeoFencingModeEnable == "true") {
                CommonService.getGPSLocation(function(latitude, longitude, timestamp, accuracy) {
                    var pluginParamSendGPS = {
                        "url": appConfig.url + "/Persons",
                        "requesttype": "PATCH",
                        "authenticationkey": localStorage.authenticationKey,
                        "params": {
                            "Latitude": latitude,
                            "Longitude": longitude,
                            "GPSTimeStamp": timestamp != undefined ? timestamp : "",
                            "Accuracy": accuracy != undefined ? accuracy : ""
                        }
                    }
    
                    PhonegapService.callWebservice(pluginParamSendGPS, function(pluginResponse) {
                        try {
                            EchoService.writeLog(EchoService.LEVEL_INFO, "LoneWorkerCtrl:", "Send GPS response:", pluginResponse);
                            //New Change 
                            var tempResponse = JSON.parse(pluginResponse);
                            var repsCode = tempResponse.ResponseCode;
                            var overviewAvaibility = tempResponse.Message.IsAvailable;
    
                            PhonegapService.setPersonStatusBackground(overviewAvaibility);
                        } catch (error) {
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "LoneWorkerCtrl:", 'Error Sending GPS..' + error);
                        }
                    }, function(error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "LoneWorkerCtrl:", 'Error Sending GPS-2..' + error);
                    });
                });
    
            }
    
            try {
                var objJson = decodeURIComponent($stateParams.messageDetails);
                var obj = JSON.parse(objJson);
                var message = obj.Message;
                var loneworkerParse;
                if (typeof message === 'string') {
                    loneworkerParse = JSON.parse(obj.Message);
                } else {
                    loneworkerParse = obj.Message;
                }
    
    
                $scope.notificationTitle = "BHV Message";
    
    
                $scope.notificationTitle = loneworkerParse.Subject;
                $scope.loneWorkerDetails.UserName = loneworkerParse.UserName;
                $scope.loneWorkerDetails.SentDate = loneworkerParse.SentDate;
                $scope.loneWorkerDetails.Latitude = loneworkerParse.Latitude;
                $scope.loneWorkerDetails.Longitude = loneworkerParse.Longitude;
                $rootScope.latlocal = $scope.loneWorkerDetails.Latitude;
                $rootScope.lonlocal = $scope.loneWorkerDetails.Longitude;
                $rootScope.LoneWorkerMessageId = loneworkerParse.LoneWorkerMessageId;
            } catch (error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "LoneWorkerCtrl:", 'error decodeURIComponent loneworker details:' + error);
            }
    
    
    
            function sendNotificationResponseLoneWorker(statusId, callBack) {
                var pluginParam = {
                    "url": appConfig.url + "/LoneWorkerMessages",
                    "requesttype": "PATCH",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "LoneWorkerMessageId": loneworkerParse.LoneWorkerMessageId,
                        "MessageStatusId": statusId
                    }
                }
                PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                    try {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "LoneWorkerCtrl:", 'sendNotificationResponseLoneWorker sent successfully..' + pluginResponse);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "LoneWorkerCtrl:", 'sendNotificationResponseLoneWorker sent error..' + error);
                    }
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "LoneWorkerCtrl:", 'Error sendNotificationResponseLoneWorker()..' + error);
                });
    
            }
    
            $scope.accept = function() {
                sendNotificationResponseLoneWorker(localStorage.read);
                $state.go('main.home');
            }
    
            $scope.openlocation = function() {
                $state.go("locationmap");
            }
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_INFO, "LoneWorkerCtrl:", 'BackPress: LoneWorkerCtrl');
                $state.go('main.home');
            };
    
    
    
        }
    ]);
    
    bhvApp.controller('LoneworkerLocationMapCtrl', ['$scope', '$state', '$rootScope', 'EchoService', function($scope, $state, $rootScope, EchoService) {
        $scope.firstvalue = $rootScope.latlocal;
        $scope.secondvalue = $rootScope.lonlocal;
        //EchoService.writeLog(EchoService.LEVEL_INFO ,"LoneworkerLocationMapCtrl:" ,'first pass value' + $scope.firstvalue);
        //EchoService.writeLog(EchoService.LEVEL_INFO ,"LoneworkerLocationMapCtrl:" ,'second pass value' + $scope.secondvalue);
    
        var mysrclat = 0;
        var mysrclong = 0;
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib = 'Map data © <a href="https://osm.org/copyright">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {
            attribution: osmAttrib,
            detectRetina: true
        });
    
        var token = 'pk.eyJ1IjoicHJvY2l0IiwiYSI6ImNqNDl1cTdwODB2YzEzM3BnbHduN3Z3dnIifQ.-ST_-Stu4vkTYJ0ZoA-bEA';
        if (localStorage.MapboxToken != undefined && localStorage.MapboxToken != null && localStorage.MapboxToken.length > 0) {
            token = localStorage.MapboxToken;
        }
        var mapboxUrl = 'https://api.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token=' + token;
        var mapboxAttrib = 'Map data © <a href="https://osm.org/copyright">OpenStreetMap</a> contributors. Tiles from <a href="https://www.mapbox.com">Mapbox</a>.';
        var mapbox = new L.TileLayer(mapboxUrl, {
            attribution: mapboxAttrib
        });
    
        $scope.accept = function() {
            window.JSInterface.close();
        }
    
        var map = new L.Map('mapPopup', {
            layers: [mapbox],
            center: [$scope.firstvalue, $scope.secondvalue],
            zoom: 16,
            zoomControl: true
        });
    
        L.marker([$scope.firstvalue, $scope.secondvalue]).addTo(map);
    
        $scope.navigateBack = function() {
            //$state.go("loneworker");
            window.history.back();
        }
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_INFO, "LoneworkerLocationMapCtrl:", 'Back pressed: LoneworkerLocationMapCtrl');
            $scope.navigateBack();
        };
    
    }]);
    
    bhvApp.controller('BuzzerCtrl', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', 'EchoService',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, EchoService) {
    
            $scope.buzzerDetails = {};
    
            try {
                var objJson = JSON.parse(decodeURIComponent($stateParams.messageDetails));
    
                $scope.buzzerDetails.actionId = objJson.Message.ActionId;
                $scope.buzzerDetails.buzzerMessageId = objJson.Message.BuzzerMessageId;
            } catch (error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'error BuzzerCtrl:' + error);
            }
    
            $scope.accept = function() {
    
                updateBuzzerMessageStatus(localStorage.read);
    
    
                PhonegapService.getCallState(function(callState) {
                    if (callState == "CALL_STATE_IDLE") {
                        var pluginParam = {
                            "url": appConfig.url + "/ConferenceCallProviders",
                            "requesttype": "PATCH",
                            "authenticationkey": localStorage.authenticationKey,
                            "params": {
                                "actionId": $scope.buzzerDetails.actionId,
                                "action": "startcall"
                            }
                        }
    
                        PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                            try {
                                //add url and authentication key to conference call as this will be used to send buzz message from native...
                                var tempParam = JSON.parse(pluginResponse);
                                tempParam.url = appConfig.url + "/BuzzerMessages";
                                tempParam.requesttype = "POST";
                                tempParam.authenticationkey = localStorage.authenticationKey;
                                tempParam.params = {
                                    "actionId": $scope.buzzerDetails.actionId
                                };
    
                                var sendParam = JSON.stringify(tempParam);
    
    
                                PhonegapService.conferenceCall(sendParam, function(conferenceCallResp) {
    
                                    var pluginParam = {
                                        "url": appConfig.url + "/ConferenceCallProviders",
                                        "requesttype": "PATCH",
                                        "authenticationkey": localStorage.authenticationKey,
                                        "params": {
                                            "actionId": $scope.buzzerDetails.actionId,
                                            "action": "endcall"
                                        }
                                    }
                                    PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                                        EchoService.writeLog(EchoService.LEVEL_INFO, "BuzzerCtrl:", 'Buzzer conference ConferenceCallProviders(EndCall)...Call stopped !!');
                                        $state.go('main.home');
    
                                    }, function(error) {
                                        EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'Buzzer conference ConferenceCallProviders(EndCall): ERROR:' + error);
                                        $state.go('main.home');
                                    });
    
                                }, function(error) {
                                    EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'Buzzer conference conferenceCall : ERROR:' + error);
                                    $state.go('main.home');
                                });
                            } catch (error) {
                                EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'ConferenceCallProviders(startcall) response parse error :Error:' + error);
                                $state.go('main.home');
                            }
    
                        }, function(error) {
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'ConferenceCallProviders(startcall) :Error:' + error);
                            $state.go('main.home');
                        });
                    } else {
                        $translate('label-CallInProgress').then(function(transResult) {
                            dialogs.notify('BHV', transResult);
                        });
                    }
                });
    
    
    
            }
    
            $scope.reject = function() {
                updateBuzzerMessageStatus(localStorage.read);
                $state.go('main.home');
            }
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "BuzzerCtrl:", 'BackPressed: BuzzerCtrl');
                $state.go('main.home');
            };
    
            function updateBuzzerMessageStatus(statusId, callBack) {
                var pluginParam = {
                    "url": appConfig.url + "/BuzzerMessages",
                    "requesttype": "PATCH",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "BuzzerMessageId": $scope.buzzerDetails.buzzerMessageId,
                        "MessageStatusId": statusId
                    }
                }
                PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                    try {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "BuzzerCtrl:", 'updateBuzzerMessageStatus sent successfully..' + pluginResponse);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'updateBuzzerMessageStatus sent error..' + error);
                    }
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "BuzzerCtrl:", 'Error updateBuzzerMessageStatus()..' + error);
                });
    
            }
    
    
        }
    ]);
    
    
    bhvApp.controller('MessageListController', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', 'EchoService',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, EchoService) {
    
            $scope.messages = [];
    
    
            function pullCalamities(callBack) {
                var pluginParam = {
                    "url": appConfig.url + "/ActionDetails",
                    "requesttype": "GET",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {}
                }
    
                PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                    try {
                        var responseArray = JSON.parse(pluginResponse);
                        angular.forEach(responseArray, function(value) {
                            var strings = value.CalamityDescription ? value.CalamityDescription.split('  ') : '';
                            if (strings) {
                                value.Title = value.LocationName + " - " + strings[0];
                                value.CalamityText = strings[1];
                            }
    
                        })
                        callBack(responseArray);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MessageListController:", 'pullcalamities() parse error:' + error);
                        callBack([]);
                    }
    
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MessageListController:", 'pullcalamities() call error:' + error);
                    callBack([]);
                });
    
            }
    
            function pullLoneworkerMessages(callBack) {
                var pluginParam = {
                    "url": appConfig.url + "/LoneWorkerMessages",
                    "requesttype": "GET",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {}
                }
    
                PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                    try {
                        var responseArray = JSON.parse(pluginResponse);
                        callBack(responseArray);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MessageListController:", 'pullLoneworkerMessages() parse error:' + error);
                        callBack([]);
                    }
    
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MessageListController:", 'pullLoneworkerMessages() call error:' + error);
                    callBack([]);
                });
    
            }
    
            function pullBuzzMessages(callBack) {
                var pluginParam = {
                    "url": appConfig.url + "/BuzzerMessages",
                    "requesttype": "GET",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {}
                }
    
                PhonegapService.callWebservice(pluginParam, function(pluginResponse) {
                    try {
                        var responseArray = JSON.parse(pluginResponse);
                        callBack(responseArray);
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "MessageListController:", 'pullBuzzMessages() parse error:' + error);
                        callBack([]);
                    }
    
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "MessageListController:", 'pullBuzzMessages() call error:' + error);
                    callBack([]);
                });
            }
    
    
            function getAllMessages(callBack) {
                $rootScope.loading = true;
                var allMessages = [];
                pullCalamities(function(calamities) {
                    angular.forEach(calamities, function(value, index) {
                        var wrappedCalamity = { "Type": "Calamity", "Message": value };
                        allMessages.push(wrappedCalamity);
                    });
    
                    pullLoneworkerMessages(function(loneworkerMessages) {
                        angular.forEach(loneworkerMessages, function(value, index) {
                            var wrappedLoneworker = { "Type": "LoneWorker", "Message": value };
                            allMessages.push(wrappedLoneworker);
                        });
    
                        pullBuzzMessages(function(buzzMessages) {
                            angular.forEach(buzzMessages, function(value, index) {
                                var wrappedBuzzMessage = { "Type": "BuzzerMessage", "Message": value };
                                allMessages.push(wrappedBuzzMessage);
                            });
                            $rootScope.loading = false;
                            callBack(allMessages);
                        });
                    });
                });
            }
    
            getAllMessages(function(allMessages) {
                $scope.messages = allMessages;
                $scope.$apply();
            });
    
            $scope.$watch('reloadMessageList', function(val) {
                if (val == true) {
    
                    $rootScope.reloadMessageList = false;
    
                    getAllMessages(function(allMessages) {
                        $scope.messages = allMessages;
                        $scope.$apply();
                    });
                }
    
            });
    
    
            $scope.handleMessageClick = function(objJson) {
                var pluginParam = {
                    "messageDetails": objJson
                }
                PhonegapService.removeMessage(pluginParam, function(pluginResponse) {});
    
                if (objJson.Type == "LoneWorker") {
                    try {
                        var strLone = JSON.stringify(objJson);
                        $state.go('loneworker', { 'messageDetails': encodeURIComponent(JSON.stringify(JSON.parse(strLone))) });
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", "LoneWorker transitionTo error" + error);
                    }
    
                } else if (objJson.Type == "Calamity") {
                    try {
                        var strCala = JSON.stringify(objJson);
                        $state.go('calamity', { 'messageDetails': encodeURIComponent(JSON.stringify(JSON.parse(strCala))) });
    
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", "Calamity transitionTo error" + error);
                    }
                } else if (objJson.Type == "BuzzerMessage") {
                    //alert("Buzz message from here ");
                    try {
                        var strBuzz = JSON.stringify(objJson);
                        $state.go('buzzer', { 'messageDetails': encodeURIComponent(JSON.stringify(JSON.parse(strBuzz))) });
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", "BuzzerMessage transitionTo error" + error);
                    }
                }
            }
        }
    ]);
    
    bhvApp.controller('KnowledgebaseController', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', 'ConnectSqliteDB', '$window', '$filter', 'EchoService', '$translate',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, ConnectSqliteDB, $window, $filter, EchoService, $translate) {
    
            $scope.showKBStatus = true;
    
            $translate('label-BusyRetrivingData').then(function(transResult) {
                $scope.kbStatus = transResult;
            });
    
            $scope.$emit('showfilter');
            $scope.knowledgebaseItems = [];
            var height = $window.innerHeight;
            $scope.bodyHeight = height * 0.7;
    
            $scope.filterOption = {};
    
            $scope.knowledgeBaseloader = function() {
                $rootScope.loading = true;
                ConnectSqliteDB.syncKnowledgeBase(function(pluginResponseSyncKB) {
                    ConnectSqliteDB.getKnowledgeBaseItems(function(pluginResponse) {
                        try {
                            $scope.knowledgebaseItems = JSON.parse(pluginResponse);
                            if ($scope.knowledgebaseItems.length == 0) {
                                $translate('label-KnowledgebaseListEmpty').then(function(transResult) {
                                    $scope.kbStatus = transResult;
                                });
                            } else {
                                $scope.showKBStatus = false;
                            }
    
    
                            angular.forEach($scope.knowledgebaseItems, function(value, index) {
                                value.filtered = true;
                            });
                            //EchoService.writeLog(EchoService.LEVEL_INFO ,"KnowledgebaseController:" ,$scope.knowledgebaseItems );
                            $rootScope.loading = false;
                            $scope.$apply();
                        } catch (error) {
                            $translate('label-KnowledgebaseListEmpty').then(function(transResult) {
                                $scope.kbStatus = transResult;
                            });
                            EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", 'error getKnowledgeBaseItems:' + error);
                        }
                    });
                });
            }
    
            if (!$rootScope.kbReload) {
                ConnectSqliteDB.getKnowledgeBaseItems(function(pluginResponse) {
                    try {
                        $scope.knowledgebaseItems = JSON.parse(pluginResponse);
                        if ($scope.knowledgebaseItems.length == 0) {
                            $translate('label-KnowledgebaseListEmpty').then(function(transResult) {
                                $scope.kbStatus = transResult;
                            });
                        } else {
                            $scope.showKBStatus = false;
                        }
    
    
                        angular.forEach($scope.knowledgebaseItems, function(value, index) {
                            value.filtered = true;
                        });
                        $scope.$apply();
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", 'error getKnowledgeBaseItems:' + error);
                        $translate('label-KnowledgebaseListEmpty').then(function(transResult) {
                            $scope.kbStatus = transResult;
                        });
                    }
                });
                $scope.knowledgeBaseloader();
            } else {
                $rootScope.kbReload = undefined;
    
                ConnectSqliteDB.getKnowledgeBaseItems(function(pluginResponse) {
                    try {
                        $scope.knowledgebaseItems = JSON.parse(pluginResponse);
                        if ($scope.knowledgebaseItems.length == 0) {
                            $translate('label-KnowledgebaseListEmpty').then(function(transResult) {
                                $scope.kbStatus = transResult;
                            });
                        } else {
                            $scope.showKBStatus = false;
                        }
    
                        angular.forEach($scope.knowledgebaseItems, function(value, index) {
                            value.filtered = true;
                        });
                        $scope.$apply();
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", 'error getKnowledgeBaseItems:' + error);
                        $translate('label-KnowledgebaseListEmpty').then(function(transResult) {
                            $scope.kbStatus = transResult;
                        });
                    }
                });
    
            }
    
            $scope.openKnowledgeBaseFilter = function() {
                var dlg = dialogs.create('views/knowledgeBaseFilter.html', 'KnowledgebaseDialogController', $scope.filterOption, {
                    size: 'lg',
                    keyboard: true,
                    backdrop: false,
                    windowClass: 'my-class'
                });
    
                dlg.result.then(function(response) {
                    if (response != null && response != undefined) {
                        $scope.filterOption = response;
                        angular.forEach($scope.knowledgebaseItems, function(value, index) {
                            if (((new Date(value.DateCreated).toDateString() == response.DateCreated.toDateString()) || !response.DateCreated) && ((value.Labels.indexOf(response.KnowledgeBaseTagId.Description) != -1) || !response.KnowledgeBaseTagId.Description)) {
                                value.filtered = true;
                            } else {
                                value.filtered = false;
                            }
                        });
    
                        try {
                            response.sortOrder = JSON.parse(response.sortOrder);
                            $scope.knowledgebaseItems = $filter('orderBy')($scope.knowledgebaseItems, response.sortOrder.fld, response.sortOrder.reverse);
                        } catch (error) {
                            //alert("form here");
                        }
    
    
                    }
                }, function(response) {
    
    
                });
            }
    
    
    
    
            $scope.$on('openfilter', function() {
                $scope.openKnowledgeBaseFilter();
            })
    
            $scope.$on('reloadKnowledgeBase', function() {
                $scope.knowledgeBaseloader();
            });
    
            $scope.handleKnowledgebaseClick = function(objJson) {
    
                if (objJson.FCKText != "null" && objJson.FCKText.trim().length > 0) {
                    $state.go('main.knowledgebasetext', { 'textContent': encodeURIComponent(objJson.FCKText) });
                    return;
                } else {
                    try {
                        if (objJson.FileName.trim().length > 0) {
                            ConnectSqliteDB.getKnowledgebaseStoragePath(function(kbPath) {
                                var ext = objJson.FileName.split('.').pop().toLowerCase();
                                if (ext == 'jpeg' || ext == 'jpg' || ext == 'png' || ext == 'gif' || ext == 'bmp') {
                                    PhonegapService.openFile(kbPath + '/' + objJson.FileName, 'image/*');
                                } else if (ext == 'txt') {
                                    PhonegapService.openFile(kbPath + '/' + objJson.FileName, 'text/plain');
                                } else if (ext == 'pdf') {
                                    PhonegapService.openFile(kbPath + '/' + objJson.FileName, 'application/pdf');
                                } else {
                                    dialogs.notify('BHV', 'Niet ondersteund kennisbank bestand');
                                }
    
                            });
                            return;
                        } else {
                            dialogs.notify('BHV', 'Niet ondersteund kennisbank bestand');
                        }
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "KnowledgebaseController:", 'error handleKnowledgebaseClick' + error);
                    }
    
                }
                //show error dialog...
                dialogs.notify('BHV', 'Fout bij openen kennisbank' + objJson.FileName);
            }
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "KnowledgebaseController:", 'Back pressed: KnowledgebaseController');
                $state.go('main.home');
            };
    
        }
    ]);
    
    bhvApp.controller('KnowledgebaseTextController', ['$scope', '$stateParams', '$state', '$rootScope', 'EchoService', '$window', '$timeout',
        function($scope, $stateParams, $state, $rootScope, EchoService, $window, $timeout) {
    
            var windowHeight = $window.innerHeight;
            var windowWidth = $window.innerWidth;
            $scope.frameHeight = windowHeight - 175;
    
            $timeout(function() {
                $scope.knowledgebaseText = decodeURIComponent($stateParams.textContent);
            });
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "KnowledgebaseController:", 'Back pressed: KnowledgebaseTextController');
                window.history.back();
            };
        }
    ]);
    
    bhvApp.controller('KnowledgebaseDialogController', ['$scope', '$modalInstance', 'data', 'ConnectSqliteDB', '$filter', 'EchoService',
        function($scope, $modalInstance, data, ConnectSqliteDB, $filter, EchoService) {
    
            $scope.model = data;
            localStorage.checkboxChecked = "false";
            $scope.sortOrders = [
                { 'Description': 'Datum oplopend', reverse: false, fld: 'DateCreated' },
                { 'Description': 'Datum aflopend', reverse: true, fld: 'DateCreated' },
                { 'Description': 'Omschrijving oplopend', reverse: false, fld: 'Description' },
                { 'Description': 'Omschrijving aflopend', reverse: true, fld: 'Description' }
            ];
    
            ConnectSqliteDB.getKnowledgeBaseTags(function(pluginResponse) {
                $scope.knowledgebaseTags = JSON.parse(pluginResponse);
                $scope.$apply();
            });
    
    
    
            $scope.close = function() {
                $modalInstance.close();
    
            }
    
            $scope.clear = function() {
                $scope.model = {};
            }
    
            $scope.cancel = function() {
                $modalInstance.dismiss();
            }
    
            $scope.save = function() {
                $modalInstance.close($scope.model);
            }
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "KnowledgebaseDialogController:", 'Back pressed: KnowledgebaseDialogController');
                $modalInstance.dismiss();
            };
    
        }
    ]);
    
    bhvApp.controller('HeartBeatCtrl', ['$scope', '$modalInstance', 'data', 'EchoService', 'appConfig', 'PhonegapService', 'CommonService', function($scope, $modalInstance, data, EchoService, appConfig, PhonegapService, CommonService) {
    
        if (localStorage.GeoFencingModeEnable == "true") {
            CommonService.getGPSLocation(function(latitude, longitude, timestamp, accuracy) {
                var pluginParamSendGPS = {
                    "url": appConfig.url + "/Persons",
                    "requesttype": "PATCH",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Latitude": latitude,
                        "Longitude": longitude,
                        "GPSTimeStamp": timestamp != undefined ? timestamp : "",
                        "Accuracy": accuracy != undefined ? accuracy : ""
                    }
                }
    
                PhonegapService.callWebservice(pluginParamSendGPS, function(pluginResponse) {
                    try {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "HeartBeatCtrl:", "Send GPS response: HeartBeat", pluginResponse);
    
                        //New Change 
                        var tempResponse = JSON.parse(pluginResponse);
                        var repsCode = tempResponse.ResponseCode;
                        var overviewAvaibility = tempResponse.Message.IsAvailable;
    
                        if (repsCode == 200 || respCode == 204) {
                            PhonegapService.setPersonStatusBackground(overviewAvaibility);
                        }
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "HeartBeatCtrl:", 'Error Sending GPS..' + error);
                    }
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "HeartBeatCtrl:", 'Error Sending GPS-2..' + error);
                });
            });
    
        }
    
        $scope.close = function() {
            $modalInstance.dismiss('OK');
        };
    
        $scope.backPress = function() {
            $modalInstance.dismiss('OK');
        };
    
    }]);
    
    bhvApp.controller('IframeController', ['$scope', 'EchoService', 'appConfig', '$window', '$timeout', '$stateParams', function($scope, EchoService, appConfig, $window, $timeout, $stateParams) {
        $timeout(function() {
            var windowHeight = $window.innerHeight;
            var windowWidth = $window.innerWidth;
            iframeHeight = windowHeight - 57;
    
            document.getElementById('iframe_controller').src = decodeURIComponent($stateParams.url);
            document.getElementById('myIframe').style.height = iframeHeight + 'px';
            document.getElementById('myIframe').style.width = windowWidth + 'px';
            document.getElementById('iframe_controller').style.width = windowWidth + 'px';
            document.getElementById('iframe_controller').onload = function() {
                /*document.getElementById('iframeLoader').style.display = 'none';*/
                document.getElementById('iframespinner').style.display = 'none';
            }
    
        });
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "IframeController:", 'Back pressed: IframeController');
    
            window.history.back();
        };
    
    }]);
    bhvApp.controller('SettingsDisableCtrl', ['$scope', '$modalInstance', 'data', '$state', function($scope, $modalInstance, data, $state) {
        $scope.settingsName = data.name;
    
        $scope.close = function() {
            $modalInstance.dismiss('OK');
            if ($scope.settingsDisableCheckBox) {
                if ($scope.settingsName == "bluetooth") {
                    localStorage.bluetoothCheckboxChecked = "true";
                } else {
                    localStorage.locationCheckboxChecked = "true";
                }
            } else {
                console.log("checkbox is not checked");
            }
        };
    
        $scope.backPress = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "SettingsDisableCtrl:", 'BackPress: SettingsDisableCtrl');
            $state.go('main.home');
        };
    }]);
    
    bhvApp.controller('BeaconCtrl', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', '$translate', 'EchoService', '$timeout', '$window', 'CommonService',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, $translate, EchoService, $timeout, $window, CommonService) {
    
            var currentBeaconLocationDetails = JSON.parse(decodeURIComponent($stateParams.messageDetails));
    
    
            //alert(JSON.stringify(currentBeaconLocationDetails));
            var parseBeaconLocationDetails = JSON.stringify(currentBeaconLocationDetails)
    
            $scope.locationId = currentBeaconLocationDetails.Message.LocationId;
            $scope.description = currentBeaconLocationDetails.Message.Description;
            $scope.latitude = currentBeaconLocationDetails.Message.Latitude;
            $scope.longitude = currentBeaconLocationDetails.Message.Longitude;
            $scope.isEntering = currentBeaconLocationDetails.Message.Enter == "true" ? true : false;
            $scope.isChild = currentBeaconLocationDetails.Message.IsChild == "true" ? true : false;
    
            $scope.backPress = function() {
    
                if ($scope.isEntering == true) {
                    //Entering location...send GPS by default
                    EchoService.writeLog(EchoService.LEVEL_INFO, "BeaconCtrl:", 'Beacon controller: Enter location confirmed using back press.');
                    $scope.enterConfirm();
                } else {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "BeaconCtrl:", 'Beacon controller: Leave location cancelled using back press:');
                    $state.go('main.home');
                }
    
            };
    
            $scope.enterConfirm = function() {
                if ($scope.isChild == true) {
                    PhonegapService.setBeaconParent($scope.locationId);
                } else {
                    PhonegapService.setBeaconLocation($scope.locationId);
                }
    
                var tempStatusId = CommonService.getPersonStatusIdFromDescription("Standby");
                sendLocationUpdate(tempStatusId, $scope.latitude, $scope.longitude, function() {
                    var status = CommonService.getStatusFromDescription("Standby");
                    localStorage.currentPersonStatus = JSON.stringify(status);
                    $state.go('main.home');
                });
            }
    
            $scope.leaveConfirm = function(confirm) {
    
                if (confirm == true && $scope.isChild == false) {
                    PhonegapService.setBeaconLocation("");
                    localStorage.removeItem("prevBeaconLocationInfo");
                    var tempStatusId = CommonService.getPersonStatusIdFromDescription("Geen dienst");
                    sendLocationUpdate(tempStatusId, '0.0', '0.0', function() {
                        var status = CommonService.getStatusFromDescription("Geen dienst");
                        localStorage.currentPersonStatus = JSON.stringify(status);
                        $state.go('main.home');
                    });
                } else if ($scope.isChild == true && confirm == true) { //TODO will never arrive ??
                    PhonegapService.removeBeaconParent();
                } else {
                    $state.go('main.home');
                }
    
            }
    
            function sendLocationUpdate(personStatusId, latitude, longitude, callBack) {
    
                //send location update...
                EchoService.writeLog(EchoService.LEVEL_INFO, "BeaconCtrl:", 'Sending beacon location:');
    
                var pluginParamSendGPS = {
                    "url": appConfig.url + "/Persons",
                    "requesttype": "PATCH",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Latitude": latitude,
                        "Longitude": longitude,
                        "PersonStatusId": personStatusId
                    }
                }
    
                PhonegapService.callWebservice(pluginParamSendGPS, function(pluginResponse) {
                    try {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "BeaconCtrl:", 'Beacon location sent successfully ' + pluginResponse);
    
                        //New Change 
                        var tempResponse = JSON.parse(pluginResponse);
                        var repsCode = tempResponse.ResponseCode;
                        var overviewAvaibility = tempResponse.Message.IsAvailable;
    
                        if (repsCode == 200 || respCode == 204) {
                            PhonegapService.setPersonStatusBackground(overviewAvaibility);
                        }
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "BeaconCtrl:", 'Error sending beacon location..' + error);
                    }
                    callBack();
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "BeaconCtrl:", 'Error sending beacon location-2..' + error);
                    callBack();
                });
    
            }
    
        }
    ]);
    
    bhvApp.controller('AboutCtrl', ['$scope', '$state', 'appConfig', 'EchoService',
        function($scope, $state, appConfig, EchoService) {
    
            $scope.version = appConfig.version;
            $scope.userName = localStorage.userName;
            $scope.LoneworkerInterval = localStorage.LoneworkerInterval;
            $scope.EnableBeaconService = localStorage.EnableBeaconService;
            $scope.BeaconInterval = localStorage.BeaconInterval;
            $scope.LocationMode = localStorage.LocationMode;
            $scope.GeoFencingMode = localStorage.GeoFencingModeEnable;
            $scope.DebugMode = localStorage.DebugMode;
    
            $scope.backPress = function() {
                EchoService.writeLog(EchoService.LEVEL_DEBUG, "AboutCtrl:", 'BackPress: AboutCtrl');
                $state.go('main.home');
            };
        }
    ]);
    bhvApp.controller('AppPermissionCtrl', ['$scope', '$modalInstance', '$state', 'EchoService', 'PhonegapService', function($scope, $modalInstance, $state, EchoService, PhonegapService) {
    
        $scope.close = function() {
            $modalInstance.dismiss('OK');
    
        };
        $scope.openAppPermissionSettings = function() {
            EchoService.writeLog(EchoService.LEVEL_DEBUG, "AppPermissionCtrl:", 'openAppPermissionSettings');
            $modalInstance.dismiss('OK');
            PhonegapService.openAppPermissionSettings(function() {
    
    
            }, function(error) {
                EchoService.writeLog(EchoService.LEVEL_ERROR, "AppPermissionCtrl:", 'error :' + error);
            });
        };
    
    }]);
    
    bhvApp.controller('WifiNetworksCtrl', ['$scope', '$stateParams', 'moment', '$state', '$rootScope', 'dialogs', 'PhonegapService', 'appConfig', '$translate', 'EchoService', '$timeout', '$window', 'CommonService',
        function($scope, $stateParams, moment, $state, $rootScope, dialogs, PhonegapService, appConfig, $translate, EchoService, $timeout, $window, CommonService) {
    
            var currentBeaconLocationDetails = JSON.parse(decodeURIComponent($stateParams.messageDetails));
            $scope.locationId = currentBeaconLocationDetails.Message.LocationId;
            $scope.description = currentBeaconLocationDetails.Message.Description;
            $scope.latitude = currentBeaconLocationDetails.Message.Latitude;
            $scope.longitude = currentBeaconLocationDetails.Message.Longitude;
            $scope.isEntering = currentBeaconLocationDetails.Message.Enter == "true" ? true : false;
            $scope.isChild = currentBeaconLocationDetails.Message.IsChild == "true" ? true : false;
    
            $scope.backPress = function() {
    
                if ($scope.isEntering == true) {
                    //Entering location...send GPS by default
                    EchoService.writeLog(EchoService.LEVEL_INFO, "WifiNetworksCtrl:", 'Enter location confirmed using back press.');
                    $scope.enterConfirm();
                } else {
                    EchoService.writeLog(EchoService.LEVEL_INFO, "WifiNetworksCtrl:", 'Leave location cancelled using back press:');
                    $state.go('main.home');
                }
    
            };
    
            $scope.enterConfirm = function() {
                if ($scope.isChild == true) {
                    PhonegapService.setWifiParent($scope.locationId);
                } else {
                    PhonegapService.setWifiLocation($scope.locationId);
                }
    
                var tempStatusId = CommonService.getPersonStatusIdFromDescription("Standby");
                sendLocationUpdate(tempStatusId, $scope.latitude, $scope.longitude, function() {
                    var status = CommonService.getStatusFromDescription("Standby");
                    localStorage.currentPersonStatus = JSON.stringify(status);
                    $state.go('main.home');
                });
            }
    
            $scope.leaveConfirm = function(confirm) {
    
                if (confirm == true && $scope.isChild == false) {
                    PhonegapService.setBeaconLocation("");
                    localStorage.removeItem("prevBeaconLocationInfo");
                    var tempStatusId = CommonService.getPersonStatusIdFromDescription("Geen dienst");
                    sendLocationUpdate(tempStatusId, '0.0', '0.0', function() {
                        var status = CommonService.getStatusFromDescription("Geen dienst");
                        localStorage.currentPersonStatus = JSON.stringify(status);
                        $state.go('main.home');
                    });
                } else if ($scope.isChild == true && confirm == true) { //TODO will never arrive ??
                    PhonegapService.removeWifiParent();
                } else {
                    $state.go('main.home');
                }
    
            }
    
            function sendLocationUpdate(personStatusId, latitude, longitude, callBack) {
    
                //send location update...
                EchoService.writeLog(EchoService.LEVEL_INFO, "WifiNetworksCtrl:", 'Sending wifi location:');
    
                var pluginParamSendGPS = {
                    "url": appConfig.url + "/Persons",
                    "requesttype": "PATCH",
                    "authenticationkey": localStorage.authenticationKey,
                    "params": {
                        "Latitude": latitude,
                        "Longitude": longitude,
                        "PersonStatusId": personStatusId
                    }
                }
    
                PhonegapService.callWebservice(pluginParamSendGPS, function(pluginResponse) {
                    try {
                        EchoService.writeLog(EchoService.LEVEL_INFO, "WifiNetworksCtrl:", 'Wifi location sent successfully ' + pluginResponse);
    
                        //New Change 
                        var tempResponse = JSON.parse(pluginResponse);
                        var repsCode = tempResponse.ResponseCode;
                        var overviewAvaibility = tempResponse.Message.IsAvailable;
    
                        if (repsCode == 200 || respCode == 204) {
                            PhonegapService.setPersonStatusBackground(overviewAvaibility);
                        }
                    } catch (error) {
                        EchoService.writeLog(EchoService.LEVEL_ERROR, "WifiNetworksCtrl:", 'Error sending wifi location..' + error);
                    }
                    callBack();
                }, function(error) {
                    EchoService.writeLog(EchoService.LEVEL_ERROR, "WifiNetworksCtrl:", 'Error sending wifi location-2..' + error);
                    callBack();
                });
    
            }
    
        }
    ]);
    