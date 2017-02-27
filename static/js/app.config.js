(function () {
    'use strict';
    
    var MODULE_NAME = 'TimeTrackr';
    
    angular
        .module(
            MODULE_NAME,
            [
                'ngMaterial', 'ngSanitize', 'indexedDB', 'pascalprecht.translate',
                'ngMessages', 'angularMoment'
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