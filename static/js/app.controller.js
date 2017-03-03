// "import" modules to satisfy jslint
/*jslint browser: true*/
/*global
    angular, console, detectIDB, moment, Promise
*/

(function (ns) {
    'use strict';
    
    ns.LocalStorage = function (keyPaths) {
        var self = this;
        
        function Store(storeName) {
            var self = this;
            
            function getDataFromStorage() {
                return angular.fromJson(localStorage[storeName] || '{}');
            }
            
            function writeDataToStorage(data) {
                localStorage[storeName] = angular.toJson(data);
            }
            
            self.storeName = storeName;
            self.data = {};
            
            if (keyPaths.hasOwnProperty(storeName) === true) {
                self.keyPath = keyPaths[storeName];
            } else {
                throw new Error('KeyPath is not defined');
            }
            
            self.getAll = function () {
                return new Promise(function (resolve, reject) {
                    var result = [],
                        idx,
                        len_data,
                        keys;
                    
                    self.data = getDataFromStorage();
                    
                    keys = Object.keys(self.data);
                    len_data = keys.length;
                    for (idx = 0; idx < len_data; idx += 1) {
                        result.push(angular.copy(self.data[keys[idx]]));
                    }
                    
                    resolve(result);
                });
            };
            
            self.insert = function (obj) {
                return new Promise(function (resolve, reject) {
                    var key = obj[self.keyPath];
                    
                    if (key !== undefined) {
                        if (self.data.hasOwnProperty(key) === false) {
                            self.data[key] = obj;
                            
                            writeDataToStorage(self.data);
                            
                            resolve(true);
                        } else {
                            reject(new Error('Key ' + key + ' already exists'));
                        }
                    } else {
                        reject(
                            new Error(
                                'Key attribute \'' + self.keyPath + '\' is undefined'
                            )
                        );
                    }
                });
            };
            
            self.upsert = function (obj) {
                return new Promise(function (resolve, reject) {
                    var key = obj[self.keyPath];
                    
                    if (key !== undefined) {
                        self.data[key] = obj;
                        
                        writeDataToStorage(self.data);
                        
                        resolve(true);
                    } else {
                        reject(
                            new Error(
                                'Key attribute \'' + self.keyPath + '\' is undefined'
                            )
                        );
                    }
                });
            };
            
            self.clear = function (obj) {
                return new Promise(function (resolve, reject) {
                    self.data = {};
                    
                    writeDataToStorage(self.data);
                    
                    resolve(true);
                });
            };
            
            self.delete = function (key) {
                return new Promise(function (resolve, reject) {
                    if (key !== undefined) {
                        if (self.data.hasOwnProperty(key) === true) {
                            delete self.data[key];
                            
                            writeDataToStorage(self.data);
                            
                            resolve(true);
                        } else {
                            reject(new Error('Key is not set in store'));
                        }
                    } else {
                        reject(new Error('Key is undefined'));
                    }
                });
            };
            
            self.data = getDataFromStorage();
        }
        
        self.openStore = function (storeName, fn) {
            var store = new Store(storeName);
            
            return fn(store);
        };
    };
    
    ns.LocalStorageFactory = function (keyPaths) {
        return new ns.LocalStorage(keyPaths);
    };
}(window));

detectIDB(function (idb_capability) {
    'use strict';

    var MODULE_NAME = 'TimeTrackr',
        BOOKING_COMING = 'BOOKING_COMING',
        BOOKING_LEAVING = 'BOOKING_LEAVING',
        BOOKING_SYNTHETIC = 'BOOKING_SYNTHETIC',
        BOOKING_NON_SYNTHETIC = 'BOOKING_NON_SYNTHETIC',
        BOOKING_DAILY_WORKING_TIME = 'BOOKING_DAILY_WORKING_TIME',
        BOOKING_MAX_DAILY_WORKING_TIME = 'BOOKING_MAX_DAILY_WORKING_TIME',
        IDB_NAME = 'TimeTrackrDB',
        IDX_BOOKING_TYPE = 'type_idx',
        IDX_BOOKING_TIMESTAMP = 'tstamp_idx',
        CONFIG_STORE_NAME = 'config',
        OBJECT_STORE_NAME = 'bookings',
        TOAST_DELAY = 3000,
        LOCAL_STORAGE_VERSION_KEY = 'TimeTrackrDBVersion',
        DATABASE_IDB = 'IndexedDB',
        DATABASE_LS = 'LocalStorage',
        local_storage_version,
        TYPE_WORKING = 'TYPE_WORKING',
        TYPE_ON_BREAK = 'TYPE_ON_BREAK',
        TYPE_AT_HOME = 'TYPE_AT_HOME',
        BREAK_AFTER = 6 * 60 * 60 * 1000,
        SECOND_BREAK_AFTER = 9 * 60 * 60 * 1000,
        FIRST_BREAK = 30 * 60 * 1000,
        SECOND_BREAK = 15 * 60 * 1000,
        SVG_LINE_HEIGHT = 80,
        SVG_PADDING_V = 30,
        SVG_PADDING_H = 30,
        SVG_TEXT_V_OFFSET = 5,
        SVG_TYPE_TEXT_V_OFFSET = SVG_LINE_HEIGHT / 2 + 5,
        SVG_TEXT_L = 30,
        database_backend = (function () {
            if (idb_capability === detectIDB.COMPATIBLE) {
                return DATABASE_IDB;
            } else {
                return DATABASE_LS;
            }
        }());

    function sort_by_timestamp_desc(a, b) {
        return b.timestamp - a.timestamp;
    }

    function TimeTrackrCtrl($scope, $indexedDB, $mdDialog, $mdToast, $locale,
        $translate, $window) {
        var storage;
        
        window.scope = $scope;
        
        if (database_backend === DATABASE_IDB) {
            storage = $indexedDB;
        } else {
            storage = window.LocalStorageFactory(
                {'config': 'setting', 'bookings': 'timestamp'}
            );
        }
        
        moment.locale($locale.id);
        
        $scope.newBookingSpeedDial = {
            trigger: function (evt) {
                if ($scope.newBookingSpeedDial.isOpen) {
                    // speed dial was open and is closed using the trigger
                    
                    $scope.trackBooking();
                }
            },
            isOpen: false
        };
        $scope.views = {
            main: {
                visible: true
            },
            manualBooking: {
                visible: false
            }
        };
        
        $scope.showView = function (view_name) {
            var view_names = Object.keys($scope.views),
                valid = view_names.indexOf(view_name) > -1,
                current_view_name,
                idx;
            
            if (!valid) {
                throw new Error('Invalid view name: ' + view_name);
            }
            
            for (idx = 0; idx < view_names.length; idx += 1) {
                current_view_name = view_names[idx];
                
                $scope.views[current_view_name].visible = current_view_name === view_name;
            }
        };
        
        $scope.bookings = [];
        $scope.selectedBookings = [];
        $scope.databaseEngine = 'IndexedDB';
        if (storage instanceof window.LocalStorage) {
            $scope.databaseEngine = 'LocalStorage';
        }
        
        $scope.config = {
            dailyWorkingTime: 7.6,
            maxDailyWorkingTime: 10,
            dailyRestPeriod: 11,
            pointsInTime: {}
        };
        
        function saveConfig() {
            storage.openStore(CONFIG_STORE_NAME, function (store) {
                var keys = Object.keys($scope.config),
                    len_keys = keys.length,
                    idx,
                    key,
                    val;
                
                for (idx = 0; idx < len_keys; idx += 1) {
                    key = keys[idx];
                    val = $scope.config[key];
                    
                    store.upsert({
                        'setting': key,
                        'value': val
                    });
                }
            });
        }
        
        function loadConfig() {
            storage.openStore(CONFIG_STORE_NAME, function (store) {
                store.getAll().then(function (result) {
                    var len_result = result.length,
                        idx,
                        setting;
                    
                    for (idx = 0; idx < len_result; idx += 1) {
                        setting = result[idx];
                        
                        if ($scope.config.hasOwnProperty(setting.setting)) {
                            $scope.config[setting.setting] = setting.value;
                        }
                    }
                });
            });
        }
        
        function NumberInputController($scope, $mdDialog, inputData) {
            $scope.hide = $mdDialog.hide;
            $scope.close = $mdDialog.cancel;
            $scope.answer = function () {
                $mdDialog.hide($scope.value);
            };
            
            $scope.value = inputData.value;
            $scope.title = inputData.title;
            $scope.placeholder = inputData.placeholder;
            $scope.ariaLabel = inputData.ariaLabel;
            $scope.ok = inputData.ok || 'OK';
            $scope.cancel = inputData.cancel || 'CANCEL';
            $scope.step = inputData.step || 'any';
        }
        
        $scope.$watch('config', saveConfig, true);
        $scope.setConfigDailyWorkingTime = function (evt) {
            $translate(['DAILY_WORKINGTIME', 'DAILY_WORKINGTIME_PLACEHOLDER', 'OK',
                        'CANCEL'])
                .then(function (translations) {
                    $mdDialog.show({
                        locals: {
                            inputData: {
                                value: $scope.config.dailyWorkingTime,
                                title: translations.DAILY_WORKINGTIME,
                                placeholder: translations.DAILY_WORKINGTIME_PLACEHOLDER,
                                ariaLabel: translations.DAILY_WORKINGTIME,
                                ok: translations.OK,
                                cancel: translations.CANCEL
                            }
                        },
                        controller: NumberInputController,
                        templateUrl: 'number_input_dialog.tmpl.html',
                        parent: angular.element(document.body),
                        targetEvent: evt,
                        clickOutsideToClose: true
                    })
                        .then(function (answer) {
                            $scope.config.dailyWorkingTime = parseFloat(answer);
                        });
                });
        };
        
        $scope.setConfigMaxDailyWorkingTime = function (evt) {
            $translate(['MAX_DAILY_WORKINGTIME', 'MAX_DAILY_WORKINGTIME_PLACEHOLDER',
                        'OK', 'CANCEL'])
                .then(function (translations) {
                    $mdDialog.show({
                        locals: {
                            inputData: {
                                value: $scope.config.maxDailyWorkingTime,
                                title: translations.MAX_DAILY_WORKINGTIME,
                                placeholder: translations.MAX_DAILY_WORKINGTIME_PLACEHOLDER,
                                ariaLabel: translations.MAX_DAILY_WORKINGTIME,
                                ok: translations.OK,
                                cancel: translations.CANCEL
                            }
                        },
                        controller: NumberInputController,
                        templateUrl: 'number_input_dialog.tmpl.html',
                        parent: angular.element(document.body),
                        targetEvent: evt,
                        clickOutsideToClose: true
                    })
                        .then(function (answer) {
                            $scope.config.maxDailyWorkingTime = parseFloat(answer);
                        });
                });
        };
        
        $scope.setConfigDailyRestPeriod = function (evt) {
            $translate(['DAILY_RESTPERIOD', 'DAILY_RESTPERIOD_PLACEHOLDER', 'OK', 'CANCEL'])
                .then(function (translations) {
                    $mdDialog.show({
                        locals: {
                            inputData: {
                                value: $scope.config.dailyRestPeriod,
                                title: translations.DAILY_RESTPERIOD,
                                placeholder: translations.DAILY_RESTPERIOD_PLACEHOLDER,
                                ariaLabel: translations.DAILY_RESTPERIOD,
                                ok: translations.OK,
                                cancel: translations.CANCEL
                            }
                        },
                        controller: NumberInputController,
                        templateUrl: 'number_input_dialog.tmpl.html',
                        parent: angular.element(document.body),
                        targetEvent: evt,
                        clickOutsideToClose: true
                    })
                        .then(function (answer) {
                            $scope.config.dailyRestPeriod = parseFloat(answer);
                        });
                });
        };
        
        function PointInTimeController($scope, $mdDialog, inputData) {
            $scope.hide = function () {
                $mdDialog.hide();
            };
            
            $scope.cancel = function () {
                $mdDialog.cancel();
            };
            
            $scope.answer = function () {
                var value;
                
                switch ($scope.type) {
                case $scope.valueAfter:
                    value = $scope.hours;
                    break;

                default:
                    value = $scope.timestamp;
                }
                
                $mdDialog.hide({
                    type: $scope.type,
                    value: value,
                    title: $scope.title
                });
            };
            
            $scope.valueAfter = 'after';
            $scope.valueAt = 'at';
            $scope.availableTypes = [
                {
                    value: $scope.valueAfter,
                    text: 'OPTION_AFTER'
                },
                {
                    value: $scope.valueAt,
                    text: 'OPTION_AT'
                }
            ];
            $scope.type = inputData.type || $scope.availableTypes[0].value;
            $scope.title = inputData.title || '';
            $scope.hours = undefined;
            $scope.timestamp = undefined;
        }
        
        $scope.showPointInTimeDialog = function (ev) {
            $mdDialog.show({
                locals: {
                    inputData: {
                        type: 'after',
                        value: undefined,
                        index: undefined,
                        title: undefined
                    }
                },
                controller: PointInTimeController,
                templateUrl: 'point_in_time_dialog.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: true
            })
                .then(function (answer) {
                    function filterNotUndefined(value) {
                        return value !== undefined;
                    }

                    var pointsInTime = $scope.config.pointsInTime,
                        pointInTime,
                        idx;

                    if (answer.title === undefined || answer.type === undefined ||
                            answer.value === undefined) {
                        return;
                    } else if (pointsInTime[answer.title] !== undefined) {
                        $translate(['DIALOG_TITLE_CONFIRM_OVERWRITE_POINT_IN_TIME',
                                    'DIALOG_CONTENT_CONFIRM_OVERWRITE_POINT_IN_TIME',
                                    'DIALOG_CONFIRM_OVERWRITE_POINT_IN_TIME',
                                    'DIALOG_CANCEL_OVERWRITE_POINT_IN_TIME'])
                            .then(function (translations) {
                                var confirmOverwrite = $mdDialog.confirm();

                                confirmOverwrite
                                    .title(translations.DIALOG_TITLE_CONFIRM_OVERWRITE_POINT_IN_TIME)
                                    .textContent(translations.DIALOG_CONTENT_CONFIRM_OVERWRITE_POINT_IN_TIME)
                                    .ariaLabel(translations.DIALOG_CONTENT_CONFIRM_OVERWRITE_POINT_IN_TIME)
                                    .ok(translations.DIALOG_CONFIRM_OVERWRITE_POINT_IN_TIME)
                                    .cancel(translations.DIALOG_CANCEL_OVERWRITE_POINT_IN_TIME);

                                $mdDialog.show(confirmOverwrite).then(function (result) {
                                    pointsInTime[answer.title] = answer;
                                });
                            });

                        return;
                    }

                    pointsInTime[answer.title] = answer;
                });
        };
        
        $scope.deletePointInTime = function (pointInTime) {
            $translate([
                'OK', 'CANCEL', 'DIALOG_TITLE_DELETE_POINT_IN_TIME',
                'DIALOG_CONTENT_DELETE_POINT_IN_TIME'
            ]).then(function (translations) {
                var confirmDeletion = $mdDialog.confirm();
                
                confirmDeletion
                    .title(translations.DIALOG_TITLE_DELETE_POINT_IN_TIME)
                    .textContent(translations.DIALOG_CONTENT_DELETE_POINT_IN_TIME)
                    .ariaLabel(translations.DIALOG_CONTENT_DELETE_POINT_IN_TIME)
                    .ok(translations.OK)
                    .cancel(translations.CANCEL);
                
                $mdDialog.show(confirmDeletion).then(function (result) {
                    delete $scope.config.pointsInTime[pointInTime.title];
                });
            });
        };
        
        function enhanceBooking(booking) {
            booking.timestamp = moment.unix(booking.timestamp);
            booking.selected = false;
            
            return booking;
        }
        
        function updateBookings() {
            storage.openStore(OBJECT_STORE_NAME, function (store) {
                store.getAll().then(function (result) {
                    $scope.bookings = result
                        .sort(sort_by_timestamp_desc)
                        .map(enhanceBooking);
                    
                    // Force ui to update
                    $scope.$applyAsync();
                });
            });
        }
        
        function isSelectedBooking(booking) {
            return booking.selected;
        }
        
        function isNotSelectedBooking(booking) {
            return booking.selected === false;
        }
        
        $scope.updateSelectedBookings = function () {
            $scope.selectedBookings = $scope.bookings.filter(isSelectedBooking);
        };
        $scope.$watch('bookings', $scope.updateSelectedBookings);
        
        $scope.deleteSelectedBookings = function (selectedBookings) {
            function doDeleteBookings(response) {
                if (response === undefined) {
                    storage.openStore(OBJECT_STORE_NAME, function (store) {
                        var idx;
                        
                        for (idx = 0; idx < selectedBookings.length; idx += 1) {
                            store.delete(selectedBookings[idx].timestamp.unix());
                        }
                    });
                } else { // UNDO pressed
                    updateBookings();
                }
            }
            
            storage.openStore(OBJECT_STORE_NAME, function (store) {
                $translate([
                    'TOAST_DELETE_MANY', 'UNDO'
                ]).then(function (translations) {
                    var toast = $mdToast.simple(),
                        idx;

                    toast
                        .textContent(translations.TOAST_DELETE_MANY)
                        .action(translations.UNDO)
                        .highlightAction(true)
                        .highlightClass('md-primary')
                        .hideDelay(TOAST_DELAY);
                    
                    $scope.bookings = $scope.bookings.filter(isNotSelectedBooking);
                    
                    $mdToast
                        .show(toast)
                        .then(doDeleteBookings)
                        .catch(doDeleteBookings);
                });
            });
        };
        
        $scope.trackBooking = function () {
            storage.openStore(OBJECT_STORE_NAME, function (store) {
                var type =  null,
                    timestamp = moment(new Date()).seconds(0);
                
                if ($scope.bookings.length === 0 ||
                        $scope.bookings[0].type === BOOKING_LEAVING) {
                    type = BOOKING_COMING;
                } else {
                    type = BOOKING_LEAVING;
                }
                
                store
                    .insert({
                        'type': type,
                        'timestamp': timestamp.unix()
                    })
                    .then(updateBookings);
            });
        };
        
        $scope.deleteBooking = function (booking) {
            function doDeleteBooking(response) {
                if (response === undefined) {
                    storage.openStore(OBJECT_STORE_NAME, function (store) {
                        store.delete(booking.timestamp.unix());
                    });
                } else { // UNDO pressed
                    updateBookings();
                }
            }
            
            $translate([
                'TOAST_DELETE_SINGLE', 'UNDO'
            ]).then(function (translations) {
                var idx = $scope.bookings.indexOf(booking),
                    toast = $mdToast.simple();

                toast
                    .textContent(translations.TOAST_DELETE_SINGLE)
                    .action(translations.UNDO)
                    .highlightAction(true)
                    .highlightClass('md-primary')
                    .hideDelay(TOAST_DELAY);

                if (idx >= 0) {
                    $scope.bookings.splice(idx, 1);

                    $mdToast
                        .show(toast)
                        .then(doDeleteBooking)
                        .catch(doDeleteBooking);
                }
            });
        };
        
        $scope.deleteAllBookings = function (evt) {
            $translate(['TOAST_DELETE_ALL', 'DIALOG_TITLE_DELETE_ALL',
                        'DIALOG_CONTENT_DELETE_ALL',
                        'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS',
                        'DIALOG_CONFIRM_DELETE_ALL',
                        'DIALOG_CANCEL_DELETE_ALL', 'UNDO'])
                .then(function (translations) {
                    var confirm = $mdDialog.confirm();

                    confirm
                        .title(translations.DIALOG_TITLE_DELETE_ALL)
                        .textContent(translations.DIALOG_CONTENT_DELETE_ALL)
                        .ariaLabel(translations.DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS)
                        .targetEvent(evt)
                        .ok(translations.DIALOG_CONFIRM_DELETE_ALL)
                        .cancel(translations.DIALOG_CANCEL_DELETE_ALL);

                    $mdDialog
                        .show(confirm)
                        .then(function () {
                            var toast = $mdToast.simple();

                            // just visually remove the bookings
                            $scope.bookings = [];

                            toast
                                .textContent(translations.TOAST_DELETE_ALL)
                                .action(translations.UNDO)
                                .highlightAction(true)
                                .highlightClass('md-primary')
                                .hideDelay(TOAST_DELAY);

                            $mdToast
                                .show(toast)
                                .then(function (response) {
                                    if (response === undefined) {
                                        // really remove the bookings from indexeddb
                                        storage.openStore(OBJECT_STORE_NAME, function (store) {
                                            store
                                                .clear()
                                                .then(updateBookings);
                                        });
                                    } else {
                                        updateBookings();
                                    }
                                });
                        });
                });
        };
        
        function getToday() {
            var today = new Date();
            
            today.setHours(0);
            today.setMinutes(0);
            today.setSeconds(0);
            today.setMilliseconds(0);
            
            return today;
        }
        
        function ManualBookingController($scope, $mdDialog, inputData) {
            $translate(['BOOKING_COMING', 'BOOKING_LEAVING'])
                .then(function (translations) {
                    $scope.hide = $mdDialog.hide;
                    $scope.close = $mdDialog.cancel;
                    $scope.answer = function () {
                        $mdDialog.hide({
                            isOld: inputData.isOld,
                            type: $scope.type,
                            date: $scope.date,
                            time: $scope.time
                        });
                    };

                    $scope.availableTypes = [
                        {
                            value: BOOKING_COMING,
                            html: translations.BOOKING_COMING
                        },
                        {
                            value: BOOKING_LEAVING,
                            html: translations.BOOKING_LEAVING
                        }
                    ];
                    $scope.type = inputData.type;
                    $scope.time = inputData.time;
                    $scope.date = inputData.date;
                    $scope.timeFocused = false;
                    $scope.focusTime = function () {
                        $scope.timeFocused = true;
                    };
                    $scope.typeFocused = false;
                    $scope.focusType = function () {
                        $scope.typeFocused = true;
                    };
                });
        }
        
        $scope.showManualBookingView = function (evt, booking) {
            var inputData = {
                    date: getToday(),
                    time: '',
                    type: null,
                    isOld: !!booking
                },
                oldBooking = booking;
            
            if (booking) {
                inputData.date = booking.timestamp.toDate();
                inputData.time = booking.timestamp.toDate();
                inputData.type = booking.type;
            }
            
            $mdDialog.show({
                locals: {
                    inputData: inputData
                },
                controller: ManualBookingController,
                templateUrl: 'edit_booking_dialog.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: evt,
                clickOutsideToClose: true,
                fullscreen: true
            })
                .then(function (answer) {
                    $translate(['TOAST_UPDATE_BOOKING', 'UNDO'])
                        .then(function (translations) {
                            var toast = $mdToast.simple(),
                                time = answer.time,
                                type = answer.type,
                                timestamp = moment(answer.date),
                                oldTimestamp,
                                oldType;

                            timestamp
                                .hours(time.getHours())
                                .minutes(time.getMinutes())
                                .seconds(time.getSeconds())
                                .milliseconds(time.getMilliseconds());

                            if (answer.isOld === true) {
                                oldTimestamp = oldBooking.timestamp;
                                oldType = oldBooking.type;

                                oldBooking.timestamp = timestamp;
                                oldBooking.type = type;

                                toast
                                    .textContent(translations.TOAST_UPDATE_BOOKING)
                                    .action(translations.UNDO)
                                    .highlightAction(true)
                                    .highlightClass('md-primary')
                                    .hideDelay(TOAST_DELAY);

                                $mdToast
                                    .show(toast)
                                    .then(function (response) {
                                        if (response === undefined) {
                                            storage.openStore(OBJECT_STORE_NAME, function (store) {
                                                store
                                                    .delete(oldTimestamp.unix())
                                                    .then(function () {
                                                        store
                                                            .insert({
                                                                'type': type,
                                                                'timestamp': timestamp.unix()
                                                            })
                                                            .then(updateBookings);
                                                    });
                                            });
                                        } else {
                                            oldBooking.timestamp = oldTimestamp;
                                            oldBooking.type = oldType;
                                        }
                                    });
                            } else {
                                storage.openStore(OBJECT_STORE_NAME, function (store) {
                                    store
                                        .insert({
                                            'type': type,
                                            'timestamp': timestamp.unix()
                                        })
                                        .then(updateBookings);
                                });
                            }
                        });
                });
        };
        
        $scope.navigator = navigator;
        
        $translate(['BOOKING_COMING', 'BOOKING_LEAVING'])
            .then(function (translations) {
                $scope.manualBooking = {
                    new: true,
                    type: null,
                    date: getToday(),
                    time: '',
                    availableTypes: [
                        {
                            value: BOOKING_COMING,
                            html: translations.BOOKING_COMING
                        },
                        {
                            value: BOOKING_LEAVING,
                            html: translations.BOOKING_LEAVING
                        }
                    ],
                    oldBooking: null
                };
            });
        
        function checkTimeSeriesValidity(timeseries) {
            var prev_bk_type = BOOKING_LEAVING,
                idx_bk,
                bk;
            
            for (idx_bk = 0; idx_bk < timeseries.length; idx_bk += 1) {
                bk = timeseries[idx_bk];
                
                if ((bk.type === BOOKING_COMING && prev_bk_type === BOOKING_COMING) ||
                        (bk.type === BOOKING_LEAVING && prev_bk_type === BOOKING_LEAVING)) {
                    return idx_bk;
                }

                prev_bk_type = bk.type;
            }

            return -1;
        }

        function sixHoursCheck(pair) {
            if (pair.type === TYPE_ON_BREAK) {
                return false;
            } else {
                return (pair.end - pair.start) >= BREAK_AFTER;
            }
        }

        function nineHoursCheck(pair, time_working, time_on_break) {
            if (pair.type === TYPE_ON_BREAK) {
                return false;
            } else {
                return (time_working + (pair.end - pair.start) > SECOND_BREAK_AFTER &&
                    time_on_break < (FIRST_BREAK + SECOND_BREAK));
            }
        }
        
        function toMicroTime(hours) {
            return hours * 60 * 60 * 1000;
        }
        
        function calcTimes(timeseries) {
            var pairs = [],
                time_on_break = 0,
                time_working = 0,
                error,
                idx_bk,
                idx_p,
                pair,
                pair_start,
                pair_end,
                pause_start,
                pause_end,
                duration_break,
                new_pair,
                new_new_pair;

            for (idx_bk = 0; idx_bk < timeseries.length; idx_bk += 2) {
                pair_start = timeseries[idx_bk].timestamp;
                pair_end = timeseries[idx_bk + 1] ?
                        timeseries[idx_bk + 1].timestamp : null;

                if (idx_bk > 0) {
                    pairs.push({
                        'start': timeseries[idx_bk - 1].timestamp,
                        'end': pair_start,
                        'type': TYPE_ON_BREAK,
                        'synthetic': BOOKING_NON_SYNTHETIC
                    });
                }

                pairs.push({
                    'start': pair_start,
                    'end': pair_end,
                    'type': TYPE_WORKING,
                    'synthetic': BOOKING_NON_SYNTHETIC
                });
            }

            for (idx_p = 0; idx_p < pairs.length; idx_p += 1) {
                pair = pairs[idx_p];

                if (pair.end === null) {
                    if (time_working < BREAK_AFTER && time_on_break < FIRST_BREAK) {
                        pair.end = pair.start.clone().add(BREAK_AFTER - time_working);
                        pair.synthetic = BOOKING_SYNTHETIC;

                        pause_start = pair.end.clone();
                        pause_end = pause_start.clone().add(FIRST_BREAK - time_on_break);

                        pairs.push({
                            'start': pause_start,
                            'end': pause_end,
                            'type': TYPE_ON_BREAK,
                            'synthetic': BOOKING_SYNTHETIC
                        });

                        pairs.push({
                            'start': pause_end.clone(),
                            'end': null,
                            'type': TYPE_WORKING,
                            'synthetic': BOOKING_SYNTHETIC
                        });
                    } else if (time_working < SECOND_BREAK_AFTER &&
                            time_on_break < (FIRST_BREAK + SECOND_BREAK)) {

                        pair.end = pair.start.clone()
                            .add(SECOND_BREAK_AFTER - time_working);
                        pair.synthetic = BOOKING_SYNTHETIC;

                        pause_start = pair.end.clone();
                        pause_end = pause_start.clone()
                            .add((FIRST_BREAK + SECOND_BREAK) - time_on_break);

                        pairs.push({
                            'start': pause_start,
                            'end': pause_end,
                            'type': TYPE_ON_BREAK,
                            'synthetic': BOOKING_SYNTHETIC
                        });

                        pairs.push({
                            'start': pause_end.clone(),
                            'end': null,
                            'type': TYPE_WORKING,
                            'synthetic': BOOKING_SYNTHETIC
                        });
                    } else if (time_working <
                            toMicroTime($scope.config.maxDailyWorkingTime)) {
                        pair.end = pair.start.clone()
                            .add(toMicroTime($scope.config.maxDailyWorkingTime) -
                                 time_working);
                        pair.synthetic = BOOKING_SYNTHETIC;
                    } else {
                        pair.end = pair.start.clone();
                    }
                }
                
                if (sixHoursCheck(pair)) {
                    pair.synthetic = BOOKING_SYNTHETIC;
                    pair_end = pair.end.clone();
                    pair.end = pair.start.clone().add(BREAK_AFTER);

                    duration_break = (time_on_break < FIRST_BREAK ?
                            FIRST_BREAK - time_on_break : SECOND_BREAK);
                    new_pair = {
                        'start': pair.start.clone().add(BREAK_AFTER),
                        'end': pair.start.clone().add(BREAK_AFTER).add(duration_break),
                        'type': TYPE_ON_BREAK,
                        'synthetic': BOOKING_SYNTHETIC
                    };

                    if (new_pair.end >= pair_end) {
                        new_pair.end = pair_end;

                        if (new_pair.end - new_pair.start > 0) {
                            pairs.splice(idx_p + 1, 0, new_pair);
                        }
                    } else if (new_pair.end < pair_end) {
                        pairs.splice(
                            idx_p + 1,
                            0,
                            new_pair,
                            {
                                'start': new_pair.end.clone(),
                                'end': pair_end,
                                'type': TYPE_WORKING,
                                'synthetic': BOOKING_SYNTHETIC
                            }
                        );
                    }
                } else if (nineHoursCheck(pair, time_working, time_on_break)) {
                    new_pair = {
                        'start': pair.start.clone()
                            .add(SECOND_BREAK_AFTER - time_working),
                        'end': pair.start.clone()
                            .add(SECOND_BREAK_AFTER - time_working).add(SECOND_BREAK),
                        'type': TYPE_ON_BREAK,
                        'synthetic': BOOKING_SYNTHETIC
                    };
                    pair_end = pair.end.clone();

                    pair.synthetic = BOOKING_SYNTHETIC;
                    pair.end = new_pair.start.clone();

                    if (new_pair.end >= pair_end) {
                        new_pair.end = pair_end;

                        pairs.splice(idx_p + 1, 0, new_pair);
                    } else if (new_pair.end < pair_end) {
                        new_new_pair = {
                            'start': new_pair.end.clone(),
                            'end': pair_end,
                            'type': TYPE_WORKING,
                            'synthetic': BOOKING_SYNTHETIC
                        };

                        pairs.splice(
                            idx_p + 1,
                            0,
                            new_pair,
                            new_new_pair
                        );
                    }
                }

                if (pair.type === TYPE_WORKING) {
                    time_working += (pair.end - pair.start);
                } else {
                    time_on_break += (pair.end - pair.start);
                }
            }
            
            return pairs;
        }
        
        function sortBookingsAsc(bookingA, bookingB) {
            return bookingA.timestamp - bookingB.timestamp;
        }
        
        function sortBookingsDesc(bookingA, bookingB) {
            return bookingB.timestamp - bookingA.timestamp;
        }
        
        function gteToday(booking) {
            return moment(0, 'HH') <= booking.timestamp;
        }
        
        $scope.timeTable = {
            startTime: '---',
            endTime: '---',
            timePairs: [],
            timeWorking: 0,
            timeOnBreak: 0,
            notTrackedBreak: 0,
            overtime: 0,
            error: false,
            svg: {
                height: 0
            }
        };
        
        function sortByValue(pointInTimeA, pointInTimeB) {
            return pointInTimeA.value - pointInTimeB.value;
        }
        
        function getPointsAfter() {
            var pointsInTime = $scope.config.pointsInTime,
                keys = Object.keys(pointsInTime),
                pointsAfter = [
                    {
                        value: toMicroTime($scope.config.dailyWorkingTime),
                        title: BOOKING_DAILY_WORKING_TIME,
                        class: 'daily-working-time'
                    },
                    {
                        value: toMicroTime($scope.config.maxDailyWorkingTime),
                        title: BOOKING_MAX_DAILY_WORKING_TIME,
                        class: 'alert'
                    }
                ],
                idx,
                pointInTime;
            
            for (idx = 0; idx < keys.length; idx += 1) {
                pointInTime = pointsInTime[keys[idx]];
                
                if (pointInTime.type === 'after') {
                    pointsAfter.push({
                        value: toMicroTime(pointInTime.value),
                        title: pointInTime.title
                    });
                }
            }
            
            pointsAfter.sort(sortByValue);
            
            return pointsAfter;
        }
        
        function getPointsAt() {
            var pointsInTime = $scope.config.pointsInTime,
                keys = Object.keys(pointsInTime),
                pointsAt = [],
                idx,
                pointInTime;
            
            for (idx = 0; idx < keys.length; idx += 1) {
                pointInTime = pointsInTime[keys[idx]];
                
                if (pointInTime.type === 'at') {
                    pointsAt.push({
                        value: moment(pointInTime.value),
                        title: pointInTime.title
                    });
                }
            }
            
            pointsAt.sort(sortByValue);
            
            return pointsAt;
        }
        
        function getLastWorkingDay(bookings, dailyRestPeriod) {
            var lenBookings = bookings.length,
                restPeriodInMicroseconds = toMicroTime(dailyRestPeriod),
                prevBooking,
                curBooking,
                timeDiff,
                idx;
            
            bookings = bookings.slice(); // Copy bookings for reversing
            bookings.sort(sortBookingsDesc);
            
            if (lenBookings <= 1) {
                return bookings;
            } else {
                prevBooking = bookings[0];

                for (idx = 1; idx >= 0; idx += 1) {
                    curBooking = bookings[idx];
                    timeDiff = (prevBooking.timestamp - curBooking.timestamp);
                    
                    if (prevBooking.type === BOOKING_COMING &&
                            curBooking.type === BOOKING_LEAVING &&
                            timeDiff >= restPeriodInMicroseconds) {
                        break; // Found two bookings where daily rest period is exceeded
                               // and the user was not working
                    }
                    
                    prevBooking = curBooking;
                }
                
                return bookings.slice(0, idx);
            }
        }
        
        function calcSvgPosititions(pair, idx) {
            pair.svg = {
                x: SVG_PADDING_H,
                y1: SVG_PADDING_V +
                    (idx * SVG_LINE_HEIGHT),
                y2: SVG_PADDING_V +
                    ((idx + 1) * SVG_LINE_HEIGHT),
                point_text_x: SVG_PADDING_H + SVG_TEXT_L,
                point_text_y1: SVG_PADDING_V +
                    (idx * SVG_LINE_HEIGHT) + SVG_TEXT_V_OFFSET,
                point_text_y2: SVG_PADDING_V +
                    ((idx + 1) * SVG_LINE_HEIGHT) + SVG_TEXT_V_OFFSET,
                type_text_x: SVG_PADDING_H + SVG_TEXT_L,
                type_text_y: SVG_PADDING_V +
                    (idx * SVG_LINE_HEIGHT) + SVG_TYPE_TEXT_V_OFFSET
            };
        }
        
        function insertSpecialPointsAtTimestamp(pairs) {
            // Insert special points of time which should occur after a given
            // timestamp.
            var lenPairs = pairs.length,
                pointsAt = getPointsAt(),
                idx,
                pair,
                pointAtIdx,
                pointAt,
                formattedValue,
                formattedStart,
                formattedEnd,
                newPair;
            
            for (idx = 0; idx < lenPairs; idx += 1) {
                pair = pairs[idx];

                if (pair.type === TYPE_WORKING || pair.type === TYPE_ON_BREAK) {
                    for (pointAtIdx = 0; pointAtIdx < pointsAt.length; pointAtIdx += 1) {
                        pointAt = pointsAt[pointAtIdx];
                        formattedValue = pointAt.value.format('HH:mm');
                        formattedStart = pair.start.format('HH:mm');
                        formattedEnd = pair.end.format('HH:mm');

                        if (idx === 0 && formattedStart === formattedValue) {
                            pair.startTitle = pointAt.title;
                            pair.startclass = pointAt.class;
                            pointAtIdx += 1;
                        } else if (formattedEnd === formattedValue) {
                            pair.endTitle = pointAt.title;
                            pair.endclass = pointAt.class;
                            pointAtIdx += 1;
                        } else if (formattedStart < formattedValue &&
                                formattedValue < formattedEnd) {
                            lenPairs += 1;

                            newPair = {
                                'start': pair.start.clone(),
                                'end': pointAt.value.clone().date(pair.start.date())
                                    .month(pair.start.month()).year(pair.start.year()),
                                'type': pair.type,
                                'synthetic': BOOKING_SYNTHETIC,
                                'endTitle': pointAt.title,
                                'endClass': pointAt.class
                            };

                            pair.start = newPair.end.clone();
                            pairs.splice(idx, 0, newPair);

                            pair = newPair;

                            pointAtIdx += 1;
                        }
                    }

                    pair.duration = pair.end - pair.start;
                }
            }
        }
        
        function insertSpecialPointsAfterAmountOfTime(pairs) {
            // Insert special points of time which should occur after a given
            // amount of hours.
            var lenPairs = pairs.length,
                pointsAfter = getPointsAfter(),
                pointAfterIdx = 0,
                pointAfter = pointsAfter[pointAfterIdx],
                timeWorking = 0,
                pair,
                timeDiff,
                newPair,
                idx;
            
            for (idx = 0; idx < lenPairs; idx += 1) {
                pair = pairs[idx];
                timeDiff = pair.end.diff(pair.start);

                if (pair.type === TYPE_WORKING) {
                    if (pointAfter &&
                            (timeWorking + timeDiff) > pointAfter.value) {
                        lenPairs += 1;

                        newPair = {
                            'start': pair.start.clone(),
                            'end': pair.start.clone()
                                .add(pointAfter.value - timeWorking),
                            'type': TYPE_WORKING,
                            'synthetic': BOOKING_SYNTHETIC,
                            'endTitle': pointAfter.title,
                            'endClass': pointAfter.class
                        };

                        pair.start = newPair.end.clone();
                        pairs.splice(idx, 0, newPair);

                        pair = newPair;

                        pointAfterIdx += 1;
                        pointAfter = pointsAfter[pointAfterIdx];
                    } else if (pointAfter &&
                            (timeWorking + timeDiff) === pointAfter.value) {
                        pair.endTitle = pointAfter.title;
                        pair.endClass = pointAfter.class;
                    }

                    timeDiff = pair.end.diff(pair.start);
                    timeWorking += timeDiff;
                }

                pair.duration = pair.end - pair.start;
            }
        }
        
        function filterTimePairsByType(timePairType) {
            return function (timePair) {
                return timePair.type === timePairType;
            };
        }
        
        function sumDurations(prevValue, timePair) {
            if (Number.isInteger(prevValue) === false) {
                prevValue = prevValue.duration;
            }
            
            return prevValue + timePair.duration;
        }
        
        $translate(['LABEL_ERROR', 'INVALID_TS_CHECK_POS', 'INVALID_TS_CHECK_FIRST'])
            .then(function (translations) {
                $scope.updateTimeTable = function () {
                    var error = false,
                        timeseries = getLastWorkingDay($scope.bookings,
                            $scope.config.dailyRestPeriod),
                        timeOnBreak = 0,
                        timeWorking = 0,
                        timeAtHome = 0,
                        notTrackedBreak = 0,
                        ts,
                        prevTs,
                        validTs,
                        pairs,
                        lastPair,
                        checkResult;

                    timeseries.sort(sortBookingsAsc);
                    checkResult = checkTimeSeriesValidity(timeseries);
                    validTs = checkResult === -1;

                    if (validTs === true) {
                        pairs = calcTimes(timeseries);
                        lastPair = pairs[pairs.length - 1];

                        // add pair for daily rest period
                        pairs.push({
                            start: lastPair.end.clone(),
                            end: lastPair.end.clone()
                                .add(toMicroTime($scope.config.dailyRestPeriod)),
                            type: TYPE_AT_HOME,
                            synthetic: BOOKING_SYNTHETIC
                        });

                        insertSpecialPointsAfterAmountOfTime(pairs);
                        insertSpecialPointsAtTimestamp(pairs);
                        pairs.forEach(calcSvgPosititions);
                        
                        timeOnBreak = pairs
                            .filter(filterTimePairsByType(TYPE_ON_BREAK))
                            .reduce(sumDurations, 0);
                        timeWorking = pairs
                            .filter(filterTimePairsByType(TYPE_WORKING))
                            .reduce(sumDurations, 0);
                        timeAtHome = pairs
                            .filter(filterTimePairsByType(TYPE_AT_HOME))
                            .reduce(sumDurations, 0);
                        
                        // Check if an additional break needs to be considered
                        // since the current timeOnBreak is not sufficient
                        if (timeWorking > SECOND_BREAK_AFTER) {
                            notTrackedBreak = Math.min(FIRST_BREAK + SECOND_BREAK - timeOnBreak,
                                timeWorking - SECOND_BREAK_AFTER);
                        } else if (timeWorking > BREAK_AFTER) {
                            notTrackedBreak = Math.min(FIRST_BREAK - timeOnBreak,
                                timeWorking - BREAK_AFTER);
                        }
                        
                        $scope.timeTable.startTime = pairs[0].start;
                        $scope.timeTable.endTime = pairs[pairs.length - 1].end;
                        $scope.timeTable.notTrackedBreak = notTrackedBreak;
                        $scope.timeTable.timeWorking = timeWorking;
                        $scope.timeTable.timeOnBreak = timeOnBreak;
                        $scope.timeTable.timeAtHome = timeAtHome;
                        $scope.timeTable.timePairs = pairs;
                        $scope.timeTable.overtime = timeWorking -
                            toMicroTime($scope.config.dailyWorkingTime);
                        $scope.timeTable.error = error;
                        $scope.timeTable.svg.height = pairs[pairs.length - 1].svg.y2 +
                            SVG_PADDING_V;
                    } else {
                        prevTs = timeseries[checkResult - 1];
                        ts = timeseries[checkResult];
                        
                        if (prevTs) {
                            error = translations.INVALID_TS_CHECK_POS +
                                [checkResult, checkResult - 1].join(translations.AND_WITH_SPACES) + '.';
                        } else {
                            error = translations.INVALID_TS_CHECK_FIRST;
                        }
                        
                        $scope.timeTable.timeWorking = 0;
                        $scope.timeTable.timeOnBreak = 0;
                        $scope.timeTable.overtime = 0;
                        $scope.timeTable.timePairs = [];
                        $scope.timeTable.error = error;
                    }
                };
            });
        
        (function () {
            updateBookings();
            loadConfig();
        }());
    }

    angular.module(MODULE_NAME).controller('TimeTrackrCtrl', TimeTrackrCtrl);

    if (database_backend === DATABASE_IDB) {
        angular
            .module(MODULE_NAME)
            .config(function ($indexedDBProvider) {
                $indexedDBProvider
                    .connection(IDB_NAME)
                    .upgradeDatabase(1, function (evt, db, tx) {
                        var objStore = db.createObjectStore(
                                'trackedActions',
                                { keyPath: 'timestamp' }
                            );

                        objStore.createIndex('type_idx', 'type', { unique: false });
                        objStore.createIndex('tstamp_idx', 'timestamp', { unique: true });
                    })
                    .upgradeDatabase(2, function (evt, db, tx) {
                        db.createObjectStore('TrackrConfig', { keyPath: 'setting' });
                    })
                    .upgradeDatabase(3, function (evt, db, tx) {
                        var objStore = db.createObjectStore('trackedBookings',
                                { keyPath: 'timestamp' });

                        objStore.createIndex('type_idx', 'type', { unique: false });
                        objStore.createIndex('tstamp_idx', 'timestamp', { unique: true });
                    })
                    .upgradeDatabase(4, function (evt, db, tx) {
                        var bookings = db.createObjectStore(
                                'bookings',
                                { keyPath: 'timestamp' }
                            ),
                            config = db.createObjectStore(
                                'config',
                                { keyPath: 'setting' }
                            ),
                            TrackrConfig = tx.objectStore('TrackrConfig'),
                            trackedBookings = tx.objectStore('trackedBookings');
                        
                        bookings.createIndex('type_idx', 'type', { unique: false });
                        bookings.createIndex('tstamp_idx', 'timestamp', { unique: true });
                        
                        trackedBookings
                            .getAll()
                            .onsuccess = function (evt) {
                                var result = evt.target.result,
                                    idx;
                                
                                for (idx = 0; idx < result.length; idx += 1) {
                                    bookings.add(result[idx]);
                                }
                            };
                        
                        TrackrConfig
                            .getAll()
                            .onsuccess = function (evt) {
                                var result = evt.target.result,
                                    idx;
                                
                                for (idx = 0; idx < result.length; idx += 1) {
                                    config.add(result[idx]);
                                }
                            };
                    })
                    .upgradeDatabase(5, function (evt, db, tx) {
                        db.deleteObjectStore('TrackrConfig');
                        db.deleteObjectStore('trackedBookings');
                        db.deleteObjectStore('trackedActions');
                    });
            });
    } else {
        local_storage_version = angular.fromJson(localStorage[LOCAL_STORAGE_VERSION_KEY] || '0');
        
        if (local_storage_version < 1) {
            console.log('Upgrading LocalStorage from 0 to 1');
            local_storage_version += 1;
            localStorage.setItem(
                'trackedActions',
                angular.toJson(
                    angular.fromJson(localStorage.getItem('trackedActions') || {})
                )
            );
        }
        if (local_storage_version < 2) {
            console.log('Upgrading LocalStorage from 1 to 2');
            local_storage_version += 1;
            localStorage.setItem(
                'TrackrConfig',
                angular.toJson(
                    angular.fromJson(localStorage.getItem('TrackrConfig') || {})
                )
            );
        }
        if (local_storage_version < 3) {
            console.log('Upgrading LocalStorage from 2 to 3');
            local_storage_version += 1;
            localStorage.setItem(
                'trackedBookings',
                angular.toJson(
                    angular.fromJson(localStorage.getItem('trackedBookings') || {})
                )
            );
        }
        if (local_storage_version < 4) {
            console.log('Upgrading LocalStorage from 3 to 4');
            local_storage_version += 1;
            localStorage.setItem('bookings', localStorage.getItem('trackedBookings'));
            localStorage.setItem('config', localStorage.getItem('TrackrConfig'));
        }
        if (local_storage_version < 5) {
            console.log('Upgrading LocalStorage from 4 to 5');
            local_storage_version += 1;
            localStorage.removeItem('trackedBookings');
            localStorage.removeItem('trackedActions');
            localStorage.removeItem('TrackrConfig');
        }
        
        localStorage[LOCAL_STORAGE_VERSION_KEY] = angular.toJson(local_storage_version);
    }
    
    angular
        .bootstrap(document, [MODULE_NAME]);
});
