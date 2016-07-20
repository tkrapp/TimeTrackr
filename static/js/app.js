// "import" modules to satisfy jslint
var angular, console, moment;

(function (angular) {
    'use strict';
    
    var BOOKING_COMING = 'BOOKING_COMING',
        BOOKING_LEAVING = 'BOOKING_LEAVING',
        IDB_NAME = 'TimeTrackrDB',
        IDX_BOOKING_TYPE = 'type_idx',
        IDX_BOOKING_TIMESTAMP = 'tstamp_idx',
        CONFIG_STORE_NAME = 'TrackrConfig',
        OBJECT_STORE_NAME = 'trackedBookings',
        TOAST_DELAY = 3000,
        // Predefine function names to satisfy jslint
        updateTrackedBookings;
    
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
    
    function TimeTrackrCtrl($scope, $indexedDB, $mdDialog, $mdToast, $locale, $translate) {
        moment.locale($locale.id);
        $scope.trackedBookings = [];
        
        $scope.trackBooking = function () {
            $indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
                var type =  null,
                    timestamp = moment(new Date()).seconds(0);
                
                if ($scope.trackedBookings.length === 0 || $scope.trackedBookings[0].type === BOOKING_LEAVING) {
                    type = BOOKING_COMING;
                } else {
                    type = BOOKING_LEAVING;
                }
                
                store
                    .insert({
                        'type': type,
                        'timestamp': timestamp.unix()
                    })
                    .then(updateTrackedBookings);
            });
        };
        
        $scope.deleteTrackedBooking = function (booking) {
            $translate(['TOAST_DELETE_SINGLE', 'UNDO']).then(function (translations) {
                var idx = $scope.trackedBookings.indexOf(booking),
                    toast = $mdToast.simple();

                toast
                    .textContent(translations.TOAST_DELETE_SINGLE)
                    .action(translations.UNDO)
                    .highlightAction(true)
                    .highlightClass('md-primary')
                    .hideDelay(TOAST_DELAY);

                console.log(arguments);
                if (idx >= 0) {
                    $scope.trackedBookings.splice(idx, 1);

                    $mdToast
                        .show(toast)
                        .then(function (response) {
                            // UNDO pressed
                            if (response === undefined) {
                                $indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
                                    store['delete'](booking.timestamp.unix());
                                });
                            } else {
                                updateTrackedBookings();
                            }
                        });
                }
            });
        };
        
        $scope.deleteAllTrackedBookings = function (evt) {
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

                        // just visually remove the tracked bookings
                        $scope.trackedBookings = [];

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
                                    // really remove the actions from indexeddb
                                    $indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
                                        store
                                            .clear()
                                            .then(updateTrackedBookings);
                                    });
                                } else {
                                    updateTrackedBookings();
                                }
                            });
                    });
            });
        };
        
        $scope.showEditBookingDialog = function (evt, booking) {
            console.log(EditBookingDialogController);
            $mdDialog.show({
                contoler: EditBookingDialogController,
                contentElement: '#dialogEditBooking',
                parent: angular.element(document.body),
                targetEvent: evt,
                clickOutsideToClose: true
            });
        };
        
        (function () {
            updateTrackedBookings();
        }());
        
        function updateTrackedBookings() {
            $indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
                store.getAll().then(function (result) {
                    var idx;
                    
                    result.sort(function (a, b) { return b.timestamp - a.timestamp; });
                    
                    for (idx = 0; idx < result.length; idx += 1) {
                        result[idx].timestamp = moment.unix(result[idx].timestamp);
                    }
                    
                    $scope.trackedBookings = result;
                });
            });
        }
    }
    try {
    angular
        .module('TimeTrackr', ['ngMaterial', 'ngSanitize', 'indexedDB', 'pascalprecht.translate'])
        .controller('TimeTrackrCtrl', TimeTrackrCtrl)
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
                });
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
        })
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
        });
    } catch (e) {
        alert(e);
    }
}(angular));
