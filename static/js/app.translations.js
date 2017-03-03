(function () {
    'use strict';
    
    var MODULE_NAME = 'TimeTrackr';
    
    angular.module(MODULE_NAME)
        .config(function ($translateProvider) {
            $translateProvider
                .translations('en_US', {
                    'TOAST_DELETE_SINGLE':
                        'Deleted booking.',
                    'TOAST_DELETE_ALL':
                        'Deleted all bookings.',
                    'TOAST_DELETE_MANY':
                        'Deleted selected bookings.',
                    'TOAST_UPDATE_BOOKING':
                        'Updated booking.',
                    'TOAST_INSERT_BOOKING':
                        'Inserted booking.',
                    'UNDO':
                        'undo',
                    'BOOKING_COMING':
                        'coming',
                    'BOOKING_LEAVING':
                        'leaving',
                    'BOOKING_SYNTHETIC':
                        'fictional',
                    'BOOKING_NON_SYNTHETIC':
                        'actual',
                    'BOOKING_DAILY_WORKING_TIME':
                        'reached daily working time',
                    'BOOKING_MAX_DAILY_WORKING_TIME':
                        'reached maximum daily working time',
                    'OCLOCK':
                        'o\'clock',
                    'HOURS':
                        'hours',
                    'NOT_AVAILABLE':
                        'Not yet available!',
                    'NO_BOOKINGS_BY_NOW':
                        'There are no bookings by now.',
                    'LABEL_ARIA_DELETE_ALL_BOOKINGS':
                        'Click here to delete all tracked bookings',
                    'LABEL_ARIA_UPDATE_TIMELINE':
                        'Click here to update the timeline',
                    'LABEL_BOOKING_TYPE':
                        'Type',
                    'LABEL_BOOKING_DATE':
                        'Date',
                    'LABEL_BOOKING_TIME':
                        'Time',
                    'LABEL_UPDATE_TIMELINE':
                        'Update timeline',
                    'LABEL_ADD_POINT_IN_TIME':
                        'Add point in time',
                    'LABEL_POINT_OF_TIME_TYPE':
                        'Insert timestamp',
                    'LABEL_POINT_OF_TIME_HOURS':
                        'Hours',
                    'LABEL_POINT_OF_TIME_TIMESTAMP':
                        'Time of day',
                    'LABEL_POINT_OF_TIME_TITLE':
                        'Title of the point in time',
                    'LABEL_OVERTIME':
                        'Overtime',
                    'LABEL_STARTTIME':
                        'Starting at',
                    'LABEL_ENDTIME':
                        'Ending at',
                    'LABEL_ERROR':
                        'Error',
                    'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS':
                        'Delete all tracked bookings',
                    'LABEL_DELETE_ALL_BOOKINGS':
                        'Delete all bookings',
                    'DIALOG_TITLE_DELETE_ALL':
                        'Do you really want to delete all bookings?',
                    'DIALOG_CONTENT_DELETE_ALL':
                        'If you confirm this, really ALL bookings are beeing deleted!',
                    'DIALOG_CONFIRM_DELETE_ALL':
                        'Yes, I do!',
                    'DIALOG_CANCEL_DELETE_ALL':
                        'Maybe not',
                    'DIALOG_TITLE_EDIT_BOOKING':
                        'Edit booking',
                    'DIALOG_TITLE_CONFIRM_OVERWRITE_POINT_IN_TIME':
                        'Overwrite point in time?',
                    'DIALOG_CONTENT_CONFIRM_OVERWRITE_POINT_IN_TIME':
                        'A point in time with this title is already defined. ' +
                        'Do you want to overwrite it?',
                    'DIALOG_CONFIRM_OVERWRITE_POINT_IN_TIME':
                        'Yes, I do!',
                    'DIALOG_CANCEL_OVERWRITE_POINT_IN_TIME':
                        'Maybe not',
                    'DIALOG_TITLE_DELETE_POINT_IN_TIME':
                        'Delete point in time',
                    'DIALOG_CONTENT_DELETE_POINT_IN_TIME':
                        'Do you really want to delete this point in time?',
                    'DAILY_WORKINGTIME':
                        'Daily working time',
                    'DAILY_WORKINGTIME_PLACEHOLDER':
                        '8 h',
                    'DAILY_RESTPERIOD':
                        'Daily rest period',
                    'DAILY_RESTPERIOD_PLACEHOLDER':
                        '11 h',
                    'MAX_DAILY_WORKINGTIME':
                        'Maximum daily working time',
                    'MAX_DAILY_WORKINGTIME_PLACEHOLDER':
                        '10 h',
                    'SAVE':
                        'Save',
                    'OK':
                        'Ok',
                    'CANCEL':
                        'Cancel',
                    'TYPE_WORKING':
                        'Working',
                    'TYPE_ON_BREAK':
                        'On Break',
                    'TYPE_AT_HOME':
                        'Daily rest period',
                    'TYPE_BREAK_NOT_TRACKED':
                        'Not tracked break',
                    'SUBHEADER_MISC_SETTINGS':
                        'Miscellaneous',
                    'SUBHEADER_WORKINGTIME_SETTINGS':
                        'Working time settings',
                    'SUBHEADER_ABOUT_SETTINGS':
                        'About TimeTrackr',
                    'SUBHEADER_TIMELINE':
                        'Calculated timeline',
                    'SUBHEADER_TIMELINE_INFO':
                        'Additional information',
                    'SUBHEADER_TIMELINE_SETTINGS':
                        'Timeline settings',
                    'SUBHEADER_DEBUG_INFORMATION':
                        'Debug information',
                    'DATABASE_ENGINE':
                        'Database engine',
                    'DATABASE_ENGINE_USED':
                        'Using',
                    'DEVELOPED_BY':
                        'Developed by',
                    'FORMAT_TIME':
                        'Format: HH:MM',
                    'REQUIRED_TIME':
                        'Please provide a time for the booking.',
                    'INVALID_TIME':
                        'Please provide a valid time for the booking.',
                    'REQUIRED_TYPE':
                        'Please choose a booking type.',
                    'INVALIDE_TYPE':
                        'Please choose a valid booking type.',
                    'REQUIRED_DATE':
                        'Please select or enter a booking date.',
                    'INVALID_DATE':
                        'Please enter a valid booking date.',
                    'UPDATE_TIMETABLE':
                        'Calculate times',
                    'OPTION_AFTER':
                        'after',
                    'OPTION_AT':
                        'at',
                    'EMPTY_NO_POINTS_IN_TIME_HEADER':
                        'No points in time defined',
                    'EMPTY_NO_POINTS_IN_TIME_CONTENT':
                        'You may define points in time which are shown in the timeline tab',
                    'INVALID_TS_CHECK_POS':
                        'Invalid timeseries. Check positions ',
                    'INVALID_TS_CHECK_FIRST':
                        'Invalid timeseries. Check first element.',
                    'AND_WITH_SPACES':
                        ' and '
                })
                .translations('de_DE', {
                    'TOAST_DELETE_SINGLE':
                        'Buchung wurde gelöscht.',
                    'TOAST_DELETE_ALL':
                        'Alle Buchungen wurden gelöscht.',
                    'TOAST_DELETE_MANY':
                        'Ausgewählte Buchungen wurden gelöscht.',
                    'TOAST_UPDATE_BOOKING':
                        'Buchung wurde aktualisiert.',
                    'TOAST_INSERT_BOOKING':
                        'Buchung wurde eingefügt.',
                    'UNDO':
                        'Rückgängig',
                    'BOOKING_COMING':
                        'kommen',
                    'BOOKING_LEAVING':
                        'gehen',
                    'BOOKING_SYNTHETIC':
                        'imaginär',
                    'BOOKING_NON_SYNTHETIC':
                        'tatsächlich',
                    'BOOKING_DAILY_WORKING_TIME':
                        'tägliche Arbeitszeit erreicht',
                    'BOOKING_MAX_DAILY_WORKING_TIME':
                        'maximale tägliche Arbeitszeit erreicht',
                    'OCLOCK':
                        'Uhr',
                    'HOURS':
                        'Stunden',
                    'NOT_AVAILABLE':
                        'Noch nicht verfügbar!',
                    'NO_BOOKINGS_BY_NOW':
                        'Momentan sind keine aufgezeichneten Buchungen vorhanden.',
                    'LABEL_ARIA_DELETE_ALL_BOOKINGS':
                        'Klicken Sie hier, um alle aufgezeichneten Buchungen zu löschen',
                    'LABEL_ARIA_UPDATE_TIMELINE':
                        'Klicken Sie hier, um den Zeitstrahl zu aktualisieren',
                    'LABEL_BOOKING_TYPE':
                        'Art',
                    'LABEL_BOOKING_DATE':
                        'Datum',
                    'LABEL_BOOKING_TIME':
                        'Uhrzeit',
                    'LABEL_UPDATE_TIMELINE':
                        'Zeitstrahl aktualisieren',
                    'LABEL_ADD_POINT_IN_TIME':
                        'Zeitpunkt hinzufügen',
                    'LABEL_POINT_OF_TIME_TYPE':
                        'Zeitpunkt einfügen',
                    'LABEL_POINT_OF_TIME_HOURS':
                        'Stunden',
                    'LABEL_POINT_OF_TIME_TIMESTAMP':
                        'Uhrzeit',
                    'LABEL_POINT_OF_TIME_TITLE':
                        'Titel des Zeitpunkts',
                    'LABEL_OVERTIME':
                        'Überzeit',
                    'LABEL_STARTTIME':
                        'Anfang',
                    'LABEL_ENDTIME':
                        'Ende',
                    'LABEL_ERROR':
                        'Fehler',
                    'DIALOG_LABEL_ARIA_DELETE_ALL_BOOKINGS':
                        'Delete all tracked bookings',
                    'LABEL_DELETE_ALL_BOOKINGS':
                        'Alle Buchungen löschen',
                    'DIALOG_TITLE_DELETE_ALL':
                        'Möchten Sie wirklich alle Buchungen löschen?',
                    'DIALOG_CONTENT_DELETE_ALL':
                        'Wenn Sie dies bestätigen, werden wirklich ALLE Buchungen gelöscht!',
                    'DIALOG_CONFIRM_DELETE_ALL':
                        'Ja, ich will!',
                    'DIALOG_CANCEL_DELETE_ALL':
                        'Lieber nicht',
                    'DIALOG_TITLE_EDIT_BOOKING':
                        'Buchung bearbeiten',
                    'DIALOG_TITLE_CONFIRM_OVERWRITE_POINT_IN_TIME':
                        'Zeitpunkt überschreiben?',
                    'DIALOG_CONTENT_CONFIRM_OVERWRITE_POINT_IN_TIME':
                        'Es ist bereits ein Zeitpunkt mit diesem Titel vorhanden. ' +
                        'Möchten Sie diesen überschreiben?',
                    'DIALOG_CONFIRM_OVERWRITE_POINT_IN_TIME':
                        'Ja, ich will',
                    'DIALOG_CANCEL_OVERWRITE_POINT_IN_TIME':
                        'Lieber nicht',
                    'DIALOG_TITLE_DELETE_POINT_IN_TIME':
                        'Zeitpunkt löschen',
                    'DIALOG_CONTENT_DELETE_POINT_IN_TIME':
                        'Möchten Sie diesen Zeitpunkt wirklich löschen?',
                    'DAILY_WORKINGTIME':
                        'Tägliche Arbeitszeit',
                    'DAILY_WORKINGTIME_PLACEHOLDER':
                        '8 h',
                    'DAILY_RESTPERIOD':
                        'Tägliche Ruhezeit',
                    'DAILY_RESTPERIOD_PLACEHOLDER':
                        '11 h',
                    'MAX_DAILY_WORKINGTIME':
                        'Maximale tägliche Arbeitszeit',
                    'MAX_DAILY_WORKINGTIME_PLACEHOLDER':
                        '10 h',
                    'SAVE':
                        'Speichern',
                    'OK':
                        'Ok',
                    'CANCEL':
                        'Abbrechen',
                    'TYPE_WORKING':
                        'Bei der Arbeit',
                    'TYPE_ON_BREAK':
                        'In Pause',
                    'TYPE_AT_HOME':
                        'Tägl. Ruhezeit',
                    'TYPE_BREAK_NOT_TRACKED':
                        'Nicht aufgezeichnete Pausenzeit',
                    'SUBHEADER_MISC_SETTINGS':
                        'Sonstiges',
                    'SUBHEADER_WORKINGTIME_SETTINGS':
                        'Arbeitszeiteinstellungen',
                    'SUBHEADER_ABOUT_SETTINGS':
                        'Über TimeTrackr',
                    'SUBHEADER_TIMELINE':
                        'Berechneter Zeitstrahl',
                    'SUBHEADER_TIMELINE_INFO':
                        'Zusätzliche Informationen',
                    'SUBHEADER_TIMELINE_SETTINGS':
                        'Zeitstrahleinstellungen',
                    'SUBHEADER_DEBUG_INFORMATION':
                        'Informationen zur Fehlerbehebung',
                    'DATABASE_ENGINE':
                        'Datenbanktechnik',
                    'DATABASE_ENGINE_USED':
                        'Nutze',
                    'DEVELOPED_BY':
                        'Entwickelt von',
                    'FORMAT_TIME':
                        'Format: HH:MM',
                    'REQUIRED_TIME':
                        'Bitte geben Sie eine Uhrzeit für die Buchung ein.',
                    'INVALID_TIME':
                        'Bitte geben Sie eine gültige Uhrzeit für die Buchung ein.',
                    'REQUIRED_TYPE':
                        'Bitte wählen Sie eine Buchungsart aus.',
                    'INVALIDE_TYPE':
                        'Bitte wählen Sie eine gültige Buchungsart aus.',
                    'REQUIRED_DATE':
                        'Bitte wählen Sie ein Buchungsdatum aus.',
                    'INVALID_DATE':
                        'Bitte geben Sie ein gültiges Buchungsdatum ein.',
                    'UPDATE_TIMETABLE':
                        'Zeiten berechnen',
                    'OPTION_AFTER':
                        'nach',
                    'OPTION_AT':
                        'um',
                    'EMPTY_NO_POINTS_IN_TIME_HEADER':
                        'Keine Zeitpunkte festgelegt',
                    'EMPTY_NO_POINTS_IN_TIME_CONTENT':
                        'Sie können Zeitpunkt definieren, welche dann im Zeitstrahl ' +
                        'angezeigt werden.',
                    'INVALID_TS_CHECK_POS':
                        'Ungültige Zeitserie. Prüfen Sie die Positionen ',
                    'INVALID_TS_CHECK_FIRST':
                        'Ungültige Zeitserie. Prüfen Sie das erste Element.',
                    'AND_WITH_SPACES':
                        ' und '
                })
                .preferredLanguage('de_DE')
                .useSanitizeValueStrategy('sanitizeParameters');
        });
}());
