(function () {
    'use strict';
    
    let MODULE_NAME = 'TimeTrackr';
    
    angular
        .module(
            MODULE_NAME,
            [
                'ngMaterial', 'ngSanitize', 'indexedDB', 'pascalprecht.translate',
                'ngMessages', 'ngMoment'
            ]
        )
        .directive('focusMe', ['$timeout', '$parse', function ($timeout, $parse) {
            return {
                link: function (scope, element, attrs) {
                    let model = $parse(attrs.focusMe);
                    
                    scope.$watch(model, function (value) {
                        if (value === true) {
                            $timeout(function () {
                                element[0].focus();
                                element[0].click();
                                
                                try {
                                    element[0].setSelectionRange(0,
                                        element[0].value.length);
                                } catch (e) {
                                    try {
                                        element[0].select();
                                    } catch (e) {
                                        // element does not support selection
                                    }
                                }
                            });
                        }
                    });
                    
                    element.bind('blur', function () {
                        scope.$apply(model.assign(scope, false));
                    });
                }
            };
        }])
        .filter('readableTimeDelta', function() {
            return function (milliseconds) {
                let negative = milliseconds < 0,
                    sign = negative ? '-' : '',
                    seconds = Math.abs(milliseconds / 1000),
                    hours = parseInt(seconds / 3600, 10),
                    remainder = seconds % 3600,
                    minutes = parseInt(remainder / 60, 10);

                if (hours < 10) {
                    hours = '0' + hours;
                }
                
                if (minutes < 10) {
                    minutes = '0' + minutes;
                }

                return sign + hours + ':' + minutes;
            };
        })
        .config(function ($mdDateLocaleProvider) {
            $mdDateLocaleProvider.formatDate = function (date) {
                return moment(date).format('YYYY-MM-DD');
            };
        })
        .config(function ($mdThemingProvider) {
            $mdThemingProvider.definePalette('white', {
                '50': 'ffffff',
                '100': 'ff0066',
                '200': 'ff0066',
                '300': 'ffffff',
                '400': 'ffffff',
                '500': 'ff0066',
                '600': 'ff0066',
                '700': 'ff0066',
                '800': 'ff0066',
                '900': 'ff0066',
                'A100': 'ffffff',
                'A200': 'ffffff',
                'A400': 'ffffff',
                'A700': 'ffffff',
                'contrastDefaultColor': 'dark',
                'contrastDarkColors': ['50', '100', '200', '300', '400', 'A100'],
                'contrastLightColors': undefined
            });
            
            $mdThemingProvider
                .theme('default')
                .primaryPalette('deep-orange')
                .accentPalette('white');
            
            $mdThemingProvider
                .theme('point-of-time-dialog')
                .primaryPalette('blue-grey')
                .accentPalette('red');;
        });
})();