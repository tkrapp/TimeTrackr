// "import" modules to satisfy jslint
var angular, console, moment;

(function (angular) {
    'use strict';
	
    var ACTION_COME = 'coming',
        ACTION_LEAVE = 'leaving',
		CONFIG_STORE_NAME = 'TrackrConfig',
		OBJECT_STORE_NAME = 'trackedActions',
		TOAST_DELAY = 3000,
        // Predefine function names to satisfy jslint
        updateTrackedActions;
    
    function TimeTrackrCtrl($scope, $indexedDB, $mdDialog, $mdToast) {
        $scope.trackedActions = [];
        
        $scope.trackAction = function () {
			$indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
				var type =  null,
					timestamp = moment(new Date()).seconds(0);
				
				if ($scope.trackedActions.length === 0 || $scope.trackedActions[0].type === ACTION_LEAVE) {
					type = ACTION_COME;
				} else {
					type = ACTION_LEAVE;
				}
				
				store
					.insert({
						'type': type,
						'timestamp': timestamp.unix()
					})
					.then(updateTrackedActions);
			});
        };
		
		$scope.deleteTrackedAction = function (action) {
			var idx = $scope.trackedActions.indexOf(action),
				toast = $mdToast.simple();
			
			toast
				.textContent('Deleted tracked action')
				.action('UNDO')
				.highlightAction(true)
                .highlightClass('md-primary')
				.hideDelay(TOAST_DELAY);
			
			if (idx >= 0) {
				$scope.trackedActions.splice(idx, 1);
				
				$mdToast
					.show(toast)
					.then(function (response) {
						// UNDO pressed
						if (response === undefined) {
							$indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
								store['delete'](action.timestamp.unix());
							});
						} else {
							updateTrackedActions();
						}
					});
			}
		};
		
		$scope.deleteAllTrackedActions = function (evt) {
			var confirm = $mdDialog.confirm();
			
			confirm
				.title('Do you really want to delete all tracked actions?')
				.textContent('If you confirm this, you agree to give me all your money!')
				.ariaLabel('Delete all tracked actions')
				.targetEvent(evt)
				.ok('Yes, I do!')
				.cancel('Maybe not');
			
			$mdDialog
				.show(confirm)
				.then(function () {
					var toast = $mdToast.simple();
					
					// just visually remove the tracked actions
					$scope.trackedActions = [];
					
					toast
						.textContent('Deleted all tracked actions.')
						.action('UNDO')
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
										.then(updateTrackedActions);
								});
							} else {
								updateTrackedActions();
							}
						});
				});
		};
		
		(function () {
			updateTrackedActions();
		}());
        
        function updateTrackedActions() {
			$indexedDB.openStore(OBJECT_STORE_NAME, function (store) {
				store.getAll().then(function (result) {
					var idx;
					
					result.sort(function (a, b) { return b.timestamp - a.timestamp; });
					
					for (idx = 0; idx < result.length; idx += 1) {
						result[idx].timestamp = moment.unix(result[idx].timestamp);
					}
					
					$scope.trackedActions = result;
				});
			});
		}
    }

    angular
        .module('TimeTrackr (beta)', ['ngMaterial', 'indexedDB'])
        .controller('TimeTrackrCtrl', TimeTrackrCtrl)
		.config(function ($indexedDBProvider) {
			$indexedDBProvider
				.connection('TimeTrackrDB')
				.upgradeDatabase(1, function (evt, db, tx) {
					console.log(arguments);
					var objStore = db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'timestamp' });
					
					objStore.createIndex('type_idx', 'type', { unique: false });
					objStore.createIndex('tstamp_idx', 'timestamp', { unique: true });
				})
				.upgradeDatabase(2, function (evt, db, tx) {
					db.createObjectStore(CONFIG_STORE_NAME, { keyPath: 'setting' });
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
				//.dark();
        });
}(angular));

/* 
    red
    pink
    purple
    deep-purple
    indigo
    blue
    light-blue
    cyan
    teal
    green
    light-green
    lime
    yellow
    amber
    orange
    deep-orange
    brown
    grey
    blue-grey
*/
