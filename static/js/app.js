// "import" modules to satisfy jslint
var angular, console, moment, Promise;

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
                        reject(new Error('Key attribute \'' + self.keyPath + '\' is undefined'));
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

(function (angular) {
    'use strict';
    
    var BOOKING_COMING = 'BOOKING_COMING',
        BOOKING_LEAVING = 'BOOKING_LEAVING',
        IDB_NAME = 'TimeTrackrDB',
        IDX_BOOKING_TYPE = 'type_idx',
        IDX_BOOKING_TIMESTAMP = 'tstamp_idx',
        CONFIG_STORE_NAME = 'config',
        OBJECT_STORE_NAME = 'bookings',
        TOAST_DELAY = 3000,
        LOCAL_STORAGE_VERSION_KEY = 'TimeTrackrDBVersion',
        local_storage_version;
    
    function EditBookingDialogController($scope, $mdDialog) {
        $scope.hide = function () {
            $mdDialog.hide();
        };
        $scope.cancel = function () {
            $mdDialog.cancel();
        };
        $scope.answer = function (answer) {
            $mdDialog.hide(answer);
        };
    }
    
    function sort_by_timestamp_desc(a, b) {
        return b.timestamp - a.timestamp;
    }
    
    function TimeTrackrCtrl($scope, $indexedDB, $mdDialog, $mdToast, $locale, $translate) {
        var storage = window.indexedDB !== undefined ? $indexedDB : window.LocalStorageFactory({'config': 'setting', 'bookings': 'timestamp'});
        
        moment.locale($locale.id);
        
        $scope.bookings = [];
        $scope.databaseEngine = storage instanceof window.LocalStorage ? 'LocalStorage' : 'indexedDB';
        
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
        }

        $scope.trackBooking = function () {
            storage.openStore(OBJECT_STORE_NAME, function (store) {
                var type =  null,
                    timestamp = moment(new Date()).seconds(0);
                
                if ($scope.bookings.length === 0 || $scope.bookings[0].type === BOOKING_LEAVING) {
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
            $translate(['TOAST_DELETE_SINGLE', 'UNDO']).then(function (translations) {
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
            $translate(['TOAST_DELETE_ALL', 'DIALOG_TITLE_DELETE_ALL', 'DIALOG_CONTENT_DELETE_ALL', 'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS', 'DIALOG_CONFIRM_DELETE_ALL', 'DIALOG_CANCEL_DELETE_ALL', 'UNDO']).then(function (translations) {
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

        $scope.showEditBookingDialog = function (evt, booking) {
            $mdDialog.show({
                contoler: EditBookingDialogController,
                contentElement: '#dialogEditBooking',
                parent: angular.element(document.body),
                targetEvent: evt,
                clickOutsideToClose: true
            });
        };

        (function () {
            updateBookings();
        }());
    }
    
    angular
        .module('TimeTrackr', ['ngMaterial', 'ngSanitize', 'indexedDB', 'pascalprecht.translate'])
        .controller('TimeTrackrCtrl', TimeTrackrCtrl)
        .config(function ($translateProvider) {
            $translateProvider
                .translations('en_US', {
                    'TOAST_DELETE_SINGLE': 'Deleted booking',
                    'TOAST_DELETE_ALL': 'Deleted all bookings.',
                    'UNDO': 'undo',
                    'BOOKING_COMING': 'coming',
                    'BOOKING_LEAVING': 'leaving',
                    'OCLOCK': 'o\'clock',
                    'NOT_AVAILABLE': 'Not yet available!',
                    'NO_BOOKINGS_BY_NOW': 'There are no bookings by now',
                    'LABEL_ARIA_DELETE_ALL_BOOKINGS': 'Click here to delete all tracked bookings',
                    'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS': 'Delete all tracked bookings',
                    'LABEL_DELETE_ALL_BOOKINGS': 'Delete all bookings',
                    'DIALOG_TITLE_DELETE_ALL': 'Do you really want to delete all bookings?',
                    'DIALOG_CONTENT_DELETE_ALL': 'If you confirm this, really ALL bookings are beeing deleted!',
                    'DIALOG_CONFIRM_DELETE_ALL': 'Yes, I do!',
                    'DIALOG_CANCEL_DELETE_ALL': 'Maybe not',
                    'DIALOG_TITLE_EDIT_BOOKING': 'Edit booking'
                })
                .translations('de_DE', {
                    'TOAST_DELETE_SINGLE': 'Buchung wurde gelöscht',
                    'TOAST_DELETE_ALL': 'Alle Buchungen wurden gelöscht.',
                    'UNDO': 'Rückgängig',
                    'BOOKING_COMING': 'kommen',
                    'BOOKING_LEAVING': 'gehen',
                    'OCLOCK': 'Uhr',
                    'NOT_AVAILABLE': 'Noch nicht verfügbar!',
                    'NO_BOOKINGS_BY_NOW': 'Momentan sind keine aufgezeichneten Buchungen vorhanden',
                    'LABEL_ARIA_DELETE_ALL_BOOKINGS': 'Klicken Sie hier, um alle aufgezeichneten Buchungen zu löschen',
                    'LABEL_DELETE_ALL_BOOKINGS': 'Alle Buchungen löschen',
                    'DIALOG_TITLE_DELETE_ALL': 'Möchten Sie wirklich alle Buchungen löschen?',
                    'DIALOG_CONTENT_DELETE_ALL': 'Wenn Sie dies bestätigen, werden wirklich ALLE Buchungen gelöscht!',
                    'DIALOG_CONFIRM_DELETE_ALL': 'Ja, ich will!',
                    'DIALOG_CANCEL_DELETE_ALL': 'Lieber nicht',
                    'DIALOG_TITLE_EDIT_BOOKING': 'Buchung bearbeiten'
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

    if (window.indexedDB !== undefined) {
        angular
            .module('TimeTrackr')
            .config(function ($indexedDBProvider) {
                $indexedDBProvider
                    .connection(IDB_NAME)
                    .upgradeDatabase(1, function (evt, db, tx) {
                        var objStore = db.createObjectStore('trackedActions', { keyPath: 'timestamp' });

                        objStore.createIndex('type_idx', 'type', { unique: false });
                        objStore.createIndex('tstamp_idx', 'timestamp', { unique: true });
                    })
                    .upgradeDatabase(2, function (evt, db, tx) {
                        db.createObjectStore('TrackrConfig', { keyPath: 'setting' });
                    })
                    .upgradeDatabase(3, function (evt, db, tx) {
                        var objStore = db.createObjectStore('trackedBookings', { keyPath: 'timestamp' });

                        objStore.createIndex('type_idx', 'type', { unique: false });
                        objStore.createIndex('tstamp_idx', 'timestamp', { unique: true });
                    })
                    .upgradeDatabase(4, function (evt, db, tx) {
                        var bookings = db.createObjectStore('bookings', { keyPath: 'timestamp' }),
                            config = db.createObjectStore('config', { keyPath: 'setting' }),
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
            localStorage.setItem('trackedActions', angular.toJson(angular.fromJson(localStorage.getItem('trackedActions') || {})));
        }
        if (local_storage_version < 2) {
            console.log('Upgrading LocalStorage from 1 to 2');
            local_storage_version += 1;
            localStorage.setItem('TrackrConfig', angular.toJson(angular.fromJson(localStorage.getItem('TrackrConfig') || {})));
        }
        if (local_storage_version < 3) {
            console.log('Upgrading LocalStorage from 2 to 3');
            local_storage_version += 1;
            localStorage.setItem('trackedBookings', angular.toJson(angular.fromJson(localStorage.getItem('trackedBookings') || {})));
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
}(angular));


























