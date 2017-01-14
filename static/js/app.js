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
        }
        
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
        
        $scope.focusInputElement = function (evt) {
            console.log(this, evt);
        };
        
        $scope.bookings = [];
        $scope.databaseEngine = 'IndexedDB';
        if (storage instanceof window.LocalStorage) {
            $scope.databaseEngine = 'LocalStorage';
        }
        
        $scope.config = {
            dailyWorkingTime: 7.6,
            maxDailyWorkingTime: 10,
            dailyRestPeriod: 11
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
        
        $scope.$watch('config', saveConfig, true);
        $scope.setConfigDailyWorkingTime = function (evt) {
            $translate([
                'DAILY_WORKINGTIME', 'DAILY_WORKINGTIME_PLACEHOLDER', 'OK', 'CANCEL'
            ]).then(function (translations) {
                var promptDialog = $mdDialog.prompt();
                
                promptDialog
                    .title(translations.DAILY_WORKINGTIME)
                    .placeholder(translations.DAILY_WORKINGTIME_PLACEHOLDER)
                    .ariaLabel(translations.DAILY_WORKINGTIME)
                    .initialValue($scope.config.dailyWorkingTime)
                    .targetEvent(evt)
                    .ok(translations.OK)
                    .cancel(translations.CANCEL);
                
                $mdDialog
                    .show(promptDialog)
                    .then(function (result) {
                        $scope.config.dailyWorkingTime = parseFloat(result);
                    });
            });
        };
        
        $scope.setConfigMaxDailyWorkingTime = function (evt) {
            $translate([
                'MAX_DAILY_WORKINGTIME', 'MAX_DAILY_WORKINGTIME_PLACEHOLDER', 'OK',
                'CANCEL'
            ]).then(function (translations) {
                var promptDialog = $mdDialog.prompt();
                
                promptDialog
                    .title(translations.MAX_DAILY_WORKINGTIME)
                    .placeholder(translations.MAX_DAILY_WORKINGTIME_PLACEHOLDER)
                    .ariaLabel(translations.MAX_DAILY_WORKINGTIME)
                    .initialValue($scope.config.maxDailyWorkingTime)
                    .targetEvent(evt)
                    .ok(translations.OK)
                    .cancel(translations.CANCEL);
                
                $mdDialog
                    .show(promptDialog)
                    .then(function (result) {
                        $scope.config.maxDailyWorkingTime = parseFloat(result);
                    });
            });
        };
        
        $scope.setConfigDailyRestPeriod = function (evt) {
            $translate([
                'DAILY_RESTPERIOD', 'DAILY_RESTPERIOD_PLACEHOLDER', 'OK', 'CANCEL'
            ]).then(function (translations) {
                var promptDialog = $mdDialog.prompt();
                
                promptDialog
                    .title(translations.DAILY_RESTPERIOD)
                    .placeholder(translations.DAILY_RESTPERIOD_PLACEHOLDER)
                    .ariaLabel(translations.DAILY_RESTPERIOD)
                    .initialValue($scope.config.dailyRestPeriod)
                    .targetEvent(evt)
                    .ok(translations.OK)
                    .cancel(translations.CANCEL);
                
                $mdDialog
                    .show(promptDialog)
                    .then(function (result) {
                        $scope.config.dailyRestPeriod = parseFloat(result);
                    });
            });
        };
        
        function updateBookings() {
            storage.openStore(OBJECT_STORE_NAME, function (store) {
                store.getAll().then(function (result) {
                    var idx;
                    
                    result.sort(sort_by_timestamp_desc);
                    
                    for (idx = 0; idx < result.length; idx += 1) {
                        result[idx].timestamp = moment.unix(result[idx].timestamp);
                    }
                    
                    $scope.bookings = result;
                    
                    // Force ui to update
                    $scope.$applyAsync();
                });
            });
        };

        $scope.trackBooking = function () {
            storage.openStore(OBJECT_STORE_NAME, function (store) {
                var type =  null,
                    timestamp = moment(new Date()).seconds(0);
                
                if ($scope.bookings.length === 0 ||
                    $scope.bookings[0].type === BOOKING_LEAVING
                ) {
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
                        .then(function (response) {
                            // UNDO pressed
                            if (response === undefined) {
                                storage.openStore(OBJECT_STORE_NAME, function (store) {
                                    store.delete(booking.timestamp.unix());
                                });
                            } else {
                                updateBookings();
                            }
                        });
                }
            });
        };
        
        $scope.deleteAllBookings = function (evt) {
            $translate([
                'TOAST_DELETE_ALL', 'DIALOG_TITLE_DELETE_ALL',
                'DIALOG_CONTENT_DELETE_ALL', 'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS',
                'DIALOG_CONFIRM_DELETE_ALL', 'DIALOG_CANCEL_DELETE_ALL', 'UNDO']
            ).then(function (translations) {
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

        $scope.showManualBookingView = function (evt, booking) {
            var manualBooking = $scope.manualBooking,
                date, time, type, is_new, old_key;
            
            if (booking) {
                date = booking.timestamp.toDate();
                time = booking.timestamp.toDate();
                type = booking.type;
            } else {
                date = getToday();
                time = '';
                type = null;
            }
            
            manualBooking.oldBooking = booking;
            manualBooking.new = !!booking;
            manualBooking.date = date;
            manualBooking.time = time;
            manualBooking.type = type;
            
            $scope.showView('manualBooking');
        };
        
        $scope.hideManualBookingView = function (evt) {
            $scope.showView('main');
        };
        
        $scope.saveManualBooking = function (evt) {
            $translate([
                'TOAST_UPDATE_BOOKING', 'UNDO'
            ]).then(function (translations) {
                var toast = $mdToast.simple(),
                    manualBooking = $scope.manualBooking,
                    time = manualBooking.time,
                    type = manualBooking.type,
                    timestamp = moment(manualBooking.date),
                    old_timestamp,
                    old_type;
                
                timestamp
                    .hours(time.getHours())
                    .minutes(time.getMinutes())
                    .seconds(time.getSeconds())
                    .milliseconds(time.getMilliseconds());
                
                $scope.hideManualBookingView();
                
                if (manualBooking.oldBooking) {
                    old_timestamp = manualBooking.oldBooking.timestamp,
                    old_type = manualBooking.oldBooking.type;
                    
                    manualBooking.oldBooking.timestamp = timestamp;
                    manualBooking.oldBooking.type = type;

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
                                    store.delete(old_timestamp.unix());

                                    store
                                        .insert({
                                            'type': type,
                                            'timestamp': timestamp.unix()
                                        })
                                        .then(updateBookings);
                                });
                            } else {
                                manualBooking.oldBooking.timestamp = old_timestamp;
                                manualBooking.oldBooking.type = old_type;
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
                    })
                }
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
                    oldBooking: null,
                };
            });
        
        function getToday () {
            var today = new Date();
            
            today.setHours(0);
            today.setMinutes(0);
            today.setSeconds(0);
            today.setMilliseconds(0);
            
            return today;
        };
        
        var TYPE_WORKING = 'TYPE_WORKING',
            TYPE_ON_BREAK = 'TYPE_ON_BREAK',
            BREAK_AFTER = 6 * 60 * 60 * 1000,
            SECOND_BREAK_AFTER = 9 * 60 * 60 * 1000,
            FIRST_BREAK = 30 * 60 * 1000,
            SECOND_BREAK = 15 * 60 * 1000;

        function checkTimeSeriesValidity (timeseries) {
            var prev_bk_type = BOOKING_LEAVING,
                idx_bk, bk;
            
            for (idx_bk = 0; idx_bk < timeseries.length; idx_bk += 1) {
                bk = timeseries[idx_bk];
                
                if ((bk.type === BOOKING_COMING && prev_bk_type === BOOKING_COMING) ||
                    (bk.type === BOOKING_LEAVING && prev_bk_type === BOOKING_LEAVING)) {
                    return idx_bk;
                }

                prev_bk_type = bk.type;
            }

            return -1;
        };

        function getReadableDiff (milliseconds) {
            var seconds = milliseconds / 1000,
                hours, minutes, remainder;

            hours = parseInt(seconds / 3600);
            remainder = seconds % 3600;
            minutes = parseInt(remainder / 60);
            
            if (hours < 10) {
                hours = '0' + hours;
            }
            if (minutes < 10) {
                minutes = '0' + minutes;
            }

            return hours + ':' + minutes;
        };

        function sixHoursCheck (pair) {
            if (pair.type == TYPE_ON_BREAK) {
                return false;
            } else {
                return (pair.end - pair.start) >= BREAK_AFTER;
            }
        };

        function nineHoursCheck (pair, time_working, time_on_break) {
            if (pair.type == TYPE_ON_BREAK) {
                return false;
            } else {
                return (time_working + (pair.end - pair.start) > SECOND_BREAK_AFTER &&
                    time_on_break < (FIRST_BREAK + SECOND_BREAK));
            }
        };
        
        function toMicroTime (hours) {
            return hours * 60 * 60 * 1000;
        }
        
        function calcTimes (timeseries) {
            var pairs = [],
                error, idx_bk, idx_p, pair, pair_start, pair_end, pause_start,
                pause_end;

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

            var time_on_break = 0,
                time_working = 0;

            for (idx_p = 0; idx_p < pairs.length; idx_p += 1) {
                pair = pairs[idx_p];

                if (pair.end === null) {
                    if (time_working < BREAK_AFTER && time_on_break < FIRST_BREAK) {
                        pair.end = pair.start.clone().add(BREAK_AFTER - time_working);
                        pair.synthetic = BOOKING_SYNTHETIC;

                        pause_start = pair.end.clone()
                        pause_end = pause_start.clone().add(FIRST_BREAK - time_on_break);

                        pairs.push({
                            'start': pause_start,
                            'end': pause_end,
                            'type': TYPE_ON_BREAK,
                            'synthetic': BOOKING_SYNTHETIC,
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

                    var duration_break = (time_on_break < FIRST_BREAK ?
                            FIRST_BREAK - time_on_break : SECOND_BREAK),
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
                    var new_pair = {
                            'start': pair.start.clone()
                                .add(SECOND_BREAK_AFTER - time_working),
                            'end': pair.start.clone()
                                .add(SECOND_BREAK_AFTER - time_working).add(SECOND_BREAK),
                            'type': TYPE_ON_BREAK,
                            'synthetic': BOOKING_SYNTHETIC
                        },
                        pair_end = pair.end.clone();

                    pair.synthetic = BOOKING_SYNTHETIC;
                    pair.end = new_pair.start.clone();

                    if (new_pair.end >= pair_end) {
                        new_pair.end = pair_end;

                        pairs.splice(idx_p + 1, 0, new_pair);
                    } else if (new_pair.end < pair_end) {
                        var new_new_pair = {
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
        };
        
        function sortBookingsAsc (booking_a, booking_b) {
            return booking_a.timestamp - booking_b.timestamp;
        };
        
        function gteToday (booking) {
            return moment(0, 'HH') <= booking.timestamp;
        }
        
        $scope.timeTable = {
            timePairs: [],
            timeWorking: 0,
            timeOnBreak: 0,
            error: false,
            svg: {
                height: 0
            }
        };
        
        var SVG_LINE_HEIGHT = 80,
            SVG_PADDING_V = 10,
            SVG_PADDING_H = 30,
            SVG_TEXT_V_OFFSET = 5,
            SVG_TYPE_TEXT_V_OFFSET = SVG_LINE_HEIGHT / 2 + 5,
            SVG_TEXT_L = 30;
        $scope.updateTimeTable = function () {
            var error = false,
                timeseries = $scope.bookings.slice(0).filter(gteToday),
                time_on_break = 0,
                time_working = 0,
                insertedDailyWorkingTime = false,
                check_result, idx_pair, pair, pairs, prev_ts, ts, valid_ts,
                time_diff, len_pairs, new_pair;
            
            timeseries.sort(sortBookingsAsc);
            check_result = checkTimeSeriesValidity(timeseries);
            valid_ts = check_result === -1;
            
            if (valid_ts === true) {
                pairs = calcTimes(timeseries);
                
                len_pairs = pairs.length;
                for (idx_pair = 0; idx_pair < len_pairs; idx_pair += 1) {
                    pair = pairs[idx_pair];
                    time_diff = pair.end.diff(pair.start);
                    
                    if (pair.type === TYPE_WORKING) {
                        if (insertedDailyWorkingTime === false &&
                            (time_working + time_diff) >
                                toMicroTime($scope.config.dailyWorkingTime)) {
                            insertedDailyWorkingTime = true;
                            len_pairs += 1;
                            
                            new_pair = {
                                'start': pair.start.clone(),
                                'end': pair.start.clone()
                                    .add(toMicroTime($scope.config.dailyWorkingTime) -
                                         time_working),
                                'type': TYPE_WORKING,
                                'synthetic': BOOKING_SYNTHETIC,
                                'dailyWorkingTime': BOOKING_DAILY_WORKING_TIME
                            };
                            
                            pair.start = new_pair.end.clone();
                            pairs.splice(idx_pair, 0, new_pair);
                            
                            pair = new_pair;
                        }
                        
                        time_diff = pair.end.diff(pair.start);
                        time_working += time_diff;
                    } else {
                        time_on_break += pair.end.diff(pair.start);
                    }
                    
                    pair.duration = getReadableDiff(pair.end - pair.start);
                    pair.svg = {
                        x: SVG_PADDING_H,
                        y1: SVG_PADDING_V +
                            (idx_pair * SVG_LINE_HEIGHT),
                        y2: SVG_PADDING_V +
                            ((idx_pair + 1) * SVG_LINE_HEIGHT),
                        point_text_x: SVG_PADDING_H + SVG_TEXT_L,
                        point_text_y1: SVG_PADDING_V +
                            (idx_pair * SVG_LINE_HEIGHT) + SVG_TEXT_V_OFFSET,
                        point_text_y2: SVG_PADDING_V +
                            ((idx_pair + 1) * SVG_LINE_HEIGHT) + SVG_TEXT_V_OFFSET,
                        type_text_x: SVG_PADDING_H + SVG_TEXT_L,
                        type_text_y: SVG_PADDING_V +
                            (idx_pair * SVG_LINE_HEIGHT) + SVG_TYPE_TEXT_V_OFFSET
                    };
                }
                
                $scope.timeTable.timeWorking = getReadableDiff(time_working);
                $scope.timeTable.timeOnBreak = getReadableDiff(time_on_break);
                $scope.timeTable.timePairs = pairs;
                $scope.timeTable.error = error;
                $scope.timeTable.svg.height = pair.svg.y2 + SVG_PADDING_V;
            } else {
                prev_ts = timeseries[check_result - 1];
                ts = timeseries[check_result];
                
                if (prev_ts) {
                    error = 'Invalid timeseries. Check positions ' +
                        (check_result - 1) + ' and ' + check_result;
                } else {
                    error = 'Invalid timeseries. Check first element.';
                }
                
                $scope.timeTable.timeWorking = 0;
                $scope.timeTable.timeOnBreak = 0;
                $scope.timeTable.timePairs = [];
                $scope.timeTable.error = error;
            }
        };
        //$scope.$watch('bookings', $scope.updateTimeTable);
        
        (function () {
            updateBookings();
            loadConfig();
        }());
    }

    angular
        .module(
            MODULE_NAME,
            [
                'ngMaterial', 'ngSanitize', 'indexedDB', 'pascalprecht.translate',
                'ngMessages'
            ]
        )
        .directive('focusMe', ['$timeout', '$parse', function ($timeout, $parse) {
            return {
                link: function (scope, element, attrs) {
                    var model = $parse(attrs.focusMe);
                    scope.$watch(model, function (value) {
                        if (value === true) {
                            $timeout(function () {
                                element[0].focus();
                                element[0].click();
                            });
                        }
                    });
                    
                    element.bind('blur', function () {
                        scope.$apply(model.assign(scope, false));
                    });
                }
            }
        }])
        .controller('TimeTrackrCtrl', TimeTrackrCtrl)
        .config(function ($mdDateLocaleProvider) {
            $mdDateLocaleProvider.formatDate = function (date) {
                return moment(date).format('YYYY-MM-DD');
            };
        })
        .config(function ($translateProvider) {
            $translateProvider
                .translations('en_US', {
                    'TOAST_DELETE_SINGLE': (
                        'Deleted booking.'
                    ),
                    'TOAST_DELETE_ALL': (
                        'Deleted all bookings.'
                    ),
                    'TOAST_UPDATE_BOOKING': (
                        'Updated booking.'
                    ),
                    'TOAST_INSERT_BOOKING': (
                        'Inserted booking.'
                    ),
                    'UNDO': (
                        'undo'
                    ),
                    'BOOKING_COMING': (
                        'coming'
                    ),
                    'BOOKING_LEAVING': (
                        'leaving'
                    ),
                    'BOOKING_SYNTHETIC': (
                        'fictional'
                    ),
                    'BOOKING_NON_SYNTHETIC': (
                        'actual'
                    ),
                    'BOOKING_DAILY_WORKING_TIME': (
                        'reached daily working time'
                    ),
                    'OCLOCK': (
                        'o\'clock'
                    ),
                    'NOT_AVAILABLE': (
                        'Not yet available!'
                    ),
                    'NO_BOOKINGS_BY_NOW': (
                        'There are no bookings by now.'
                    ),
                    'LABEL_ARIA_DELETE_ALL_BOOKINGS': (
                        'Click here to delete all tracked bookings'
                    ),
                    'LABEL_BOOKING_TYPE': (
                        'Type'
                    ),
                    'LABEL_BOOKING_DATE': (
                        'Date'
                    ),
                    'LABEL_BOOKING_TIME': (
                        'Time'
                    ),
                    'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS': (
                        'Delete all tracked bookings'
                    ),
                    'LABEL_DELETE_ALL_BOOKINGS': (
                        'Delete all bookings'
                    ),
                    'DIALOG_TITLE_DELETE_ALL': (
                        'Do you really want to delete all bookings?'
                    ),
                    'DIALOG_CONTENT_DELETE_ALL': (
                        'If you confirm this, really ALL bookings are beeing deleted!'
                    ),
                    'DIALOG_CONFIRM_DELETE_ALL': (
                        'Yes, I do!'
                    ),
                    'DIALOG_CANCEL_DELETE_ALL': (
                        'Maybe not'
                    ),
                    'DIALOG_TITLE_EDIT_BOOKING': (
                        'Edit booking'
                    ),
                    'DAILY_WORKINGTIME': (
                        'Daily working time'
                    ),
                    'DAILY_WORKINGTIME_PLACEHOLDER': (
                        '8 h'
                    ),
                    'DAILY_RESTPERIOD': (
                        'Daily rest period'
                    ),
                    'DAILY_RESTPERIOD_PLACEHOLDER': (
                        '11 h'
                    ),
                    'MAX_DAILY_WORKINGTIME': (
                        'Maximum daily working time'
                    ),
                    'MAX_DAILY_WORKINGTIME_PLACEHOLDER': (
                        '10 h'
                    ),
                    'SAVE': (
                        'Save'
                    ),
                    'OK': (
                        'Ok'
                    ),
                    'CANCEL': (
                        'Cancel'
                    ),
                    'TYPE_WORKING': (
                        'Working'
                    ),
                    'TYPE_ON_BREAK': (
                        'On Break'
                    ),
                    'SUBHEADER_MISC_SETTINGS': (
                        'Miscellaneous'
                    ),
                    'SUBHEADER_WORKINGTIME_SETTINGS': (
                        'Working time settings'
                    ),
                    'SUBHEADER_ABOUT_SETTINGS': (
                        'About TimeTrackr'
                    ),
                    'DATABASE_ENGINE': (
                        'Database engine'
                    ),
                    'DATABASE_ENGINE_USED': (
                        'Using'
                    ),
                    'DEVELOPED_BY': (
                        'Developed by'
                    ),
                    'FORMAT_TIME': (
                        'Format: HH:MM'
                    ),
                    'REQUIRED_TIME': (
                        'Please provide a time for the booking.'
                    ),
                    'INVALID_TIME': (
                        'Please provide a valid time for the booking.'
                    ),
                    'REQUIRED_TYPE': (
                        'Please choose a booking type.'
                    ),
                    'INVALIDE_TYPE': (
                        'Please choose a valid booking type.'
                    ),
                    'REQUIRED_DATE': (
                        'Please select or enter a booking date.'
                    ),
                    'INVALID_DATE': (
                        'Please enter a valid booking date.'
                    ),
                    'UPDATE_TIMETABLE': (
                        'Calculate times'
                    )
                })
                .translations('de_DE', {
                    'TOAST_DELETE_SINGLE': (
                        'Buchung wurde gelöscht.'
                    ),
                    'TOAST_DELETE_ALL': (
                        'Alle Buchungen wurden gelöscht.'
                    ),
                    'TOAST_UPDATE_BOOKING': (
                        'Buchung wurde aktualisiert.'
                    ),
                    'TOAST_INSERT_BOOKING': (
                        'Buchung wurde eingefügt.'
                    ),
                    'UNDO': (
                        'Rückgängig'
                    ),
                    'BOOKING_COMING': (
                        'kommen'
                    ),
                    'BOOKING_LEAVING': (
                        'gehen'
                    ),
                    'BOOKING_SYNTHETIC': (
                        'imaginär'
                    ),
                    'BOOKING_NON_SYNTHETIC': (
                        'tatsächlich'
                    ),
                    'BOOKING_DAILY_WORKING_TIME': (
                        'tägliche Arbeitszeit erreicht'
                    ),
                    'OCLOCK': (
                        'Uhr'
                    ),
                    'NOT_AVAILABLE': (
                        'Noch nicht verfügbar!'
                    ),
                    'NO_BOOKINGS_BY_NOW': (
                        'Momentan sind keine aufgezeichneten Buchungen vorhanden.'
                    ),
                    'LABEL_ARIA_DELETE_ALL_BOOKINGS': (
                        'Klicken Sie hier, um alle aufgezeichneten Buchungen zu löschen'
                    ),
                    'LABEL_BOOKING_TYPE': (
                        'Art'
                    ),
                    'LABEL_BOOKING_DATE': (
                        'Datum'
                    ),
                    'LABEL_BOOKING_TIME': (
                        'Uhrzeit'
                    ),
                    'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS': (
                        'Delete all tracked bookings'
                    ),
                    'LABEL_DELETE_ALL_BOOKINGS': (
                        'Alle Buchungen löschen'
                    ),
                    'DIALOG_TITLE_DELETE_ALL': (
                        'Möchten Sie wirklich alle Buchungen löschen?'
                    ),
                    'DIALOG_CONTENT_DELETE_ALL': (
                        'Wenn Sie dies bestätigen, werden wirklich ALLE Buchungen gelöscht!'
                    ),
                    'DIALOG_CONFIRM_DELETE_ALL': (
                        'Ja, ich will!'
                    ),
                    'DIALOG_CANCEL_DELETE_ALL': (
                        'Lieber nicht'
                    ),
                    'DIALOG_TITLE_EDIT_BOOKING': (
                        'Buchung bearbeiten'
                    ),
                    'DAILY_WORKINGTIME': (
                        'Tägliche Arbeitszeit'
                    ),
                    'DAILY_WORKINGTIME_PLACEHOLDER': (
                        '8 h'
                    ),
                    'DAILY_RESTPERIOD': (
                        'Tägliche Ruhezeit'
                    ),
                    'DAILY_RESTPERIOD_PLACEHOLDER': (
                        '11 h'
                    ),
                    'MAX_DAILY_WORKINGTIME': (
                        'Maximale tägliche Arbeitszeit'
                    ),
                    'MAX_DAILY_WORKINGTIME_PLACEHOLDER': (
                        '10 h'
                    ),
                    'SAVE': (
                        'Speichern'
                    ),
                    'OK': (
                        'Ok'
                    ),
                    'CANCEL': (
                        'Abbrechen'
                    ),
                    'TYPE_WORKING': (
                        'Bei der Arbeit'
                    ),
                    'TYPE_ON_BREAK': (
                        'In Pause'
                    ),
                    'SUBHEADER_MISC_SETTINGS': (
                        'Sonstiges'
                    ),
                    'SUBHEADER_WORKINGTIME_SETTINGS': (
                        'Arbeitszeiteinstellungen'
                    ),
                    'SUBHEADER_ABOUT_SETTINGS': (
                        'Über TimeTrackr'
                    ),
                    'DATABASE_ENGINE': (
                        'Datenbanktechnik'
                    ),
                    'DATABASE_ENGINE_USED': (
                        'Nutze'
                    ),
                    'DEVELOPED_BY': (
                        'Entwickelt von'
                    ),
                    'FORMAT_TIME': (
                        'Format: HH:MM'
                    ),
                    'REQUIRED_TIME': (
                        'Bitte geben Sie eine Uhrzeit für die Buchung ein.'
                    ),
                    'INVALID_TIME': (
                        'Bitte geben Sie eine gültige Uhrzeit für die Buchung ein.'
                    ),
                    'REQUIRED_TYPE': (
                        'Bitte wählen Sie eine Buchungsart aus.'
                    ),
                    'INVALIDE_TYPE': (
                        'Bitte wählen Sie eine gültige Buchungsart aus.'
                    ),
                    'REQUIRED_DATE': (
                        'Bitte wählen Sie ein Buchungsdatum aus.'
                    ),
                    'INVALID_DATE': (
                        'Bitte geben Sie ein gültiges Buchungsdatum ein.'
                    ),
                    'UPDATE_TIMETABLE': (
                        'Zeiten berechnen'
                    )
                })
                .preferredLanguage('de_DE')
                .useSanitizeValueStrategy('sanitizeParameters');
        })
        .config(function ($mdThemingProvider) {
            $mdThemingProvider.definePalette('white', {
                '50': 'ffffff',
                '100': 'ffffff',
                '200': 'ffffff',
                '300': 'ffffff',
                '400': 'ffffff',
                '500': 'ffffff',
                '600': 'ffffff',
                '700': 'ffffff',
                '800': 'ffffff',
                '900': 'ffffff',
                'A100': 'ffffff',
                'A200': 'ffffff',
                'A400': 'ffffff',
                'A700': 'ffffff',
                'contrastDefaultColor': 'dark'
            });
            
            $mdThemingProvider
                .theme('default')
                .primaryPalette('deep-orange')
                .accentPalette('white');
        });

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
                        var objStore = db.createObjectStore(
                               'trackedBookings',
                               { keyPath: 'timestamp' }
                            );

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
