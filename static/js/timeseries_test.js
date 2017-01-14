// TimeSeries testing
(function () {
    'use strict';
    
    var TYPE_COMING = 0,
        TYPE_LEAVING = 1,
        TYPE_WORKING = 2,
        TYPE_ON_BREAK = 3,
        BREAK_AFTER = 6 * 60 * 60 * 1000,
        SECOND_BREAK_AFTER = 9 * 60 * 60 * 1000,
        DAILY_WORKING_TIME = 6.8 * 60 * 60 * 1000,
        MAX_TIME = 10 * 60 * 60 * 1000,
        FIRST_BREAK = 30 * 60 * 1000,
        SECOND_BREAK = 15 * 60 * 1000,
        timeserieses = [
            [ // day with 30 min break
                {'timestamp': moment("2016-07-22 06:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 12:00"), 'type': TYPE_LEAVING},
                {'timestamp': moment("2016-07-22 12:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 14:00"), 'type': TYPE_LEAVING}
            ],
            [ // day without break
                {'timestamp': moment("2016-07-22 06:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 14:00"), 'type': TYPE_LEAVING}
            ],
            [ // 10h day without break
                {'timestamp': moment("2016-07-22 06:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 16:30"), 'type': TYPE_LEAVING}
            ],
            [ // strange break
                {'timestamp': moment("2016-07-22 06:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 13:00"), 'type': TYPE_LEAVING},
                {'timestamp': moment("2016-07-22 13:40"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 16:30"), 'type': TYPE_LEAVING}
            ],
            [ // open timeseries
                {'timestamp': moment("2016-07-22 08:30"), 'type': TYPE_COMING}
            ],
            [ // 2nd open timeseries
                {'timestamp': moment("2016-07-22 08:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 10:30"), 'type': TYPE_LEAVING},
                {'timestamp': moment("2016-07-22 11:10"), 'type': TYPE_COMING}
            ],
            [ // 3rd open timeseries
                {'timestamp': moment("2016-07-22 08:30"), 'type': TYPE_COMING},
                {'timestamp': moment("2016-07-22 10:30"), 'type': TYPE_LEAVING},
                {'timestamp': moment("2016-07-22 11:00"), 'type': TYPE_COMING}
            ]
        ],
        idx_ts, idx_bk, booking, timeseries, valid, check_result, ts, prev_ts;
    
    function checkTimeSeriesValidity (timeseries) {
        var prev_bk_type = TYPE_LEAVING,
            idx_bk, bk;
        
        for (idx_bk = 0; idx_bk < timeseries.length; idx_bk += 1) {
            bk = timeseries[idx_bk];
            
            if ((bk.type === TYPE_COMING && prev_bk_type === TYPE_COMING) ||
                (bk.type === TYPE_LEAVING && prev_bk_type === TYPE_LEAVING)) {
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
    
    function calcTimes (timeseries) {
        var pairs = [],
            error, idx_bk, idx_p, pair, pair_start, pair_end, pause_start, pause_end;
        
        for (idx_bk = 0; idx_bk < timeseries.length; idx_bk += 2) {
            pair_start = timeseries[idx_bk].timestamp;
            pair_end = timeseries[idx_bk + 1] ? timeseries[idx_bk + 1].timestamp : null;
            
            if (idx_bk > 0) {
                pairs.push({
                    'start': timeseries[idx_bk - 1].timestamp,
                    'end': pair_start,
                    'type': TYPE_ON_BREAK,
                    'synthetic': false
                });
            }
            
            pairs.push({
                'start': pair_start,
                'end': pair_end,
                'type': TYPE_WORKING,
                'synthetic': false
            });
        }
        
        var time_on_break = 0,
            time_working = 0;

        for (idx_p = 0; idx_p < pairs.length; idx_p += 1) {
            pair = pairs[idx_p];
            
            if (pair.end === null) {
                if (time_working < BREAK_AFTER && time_on_break < FIRST_BREAK) {
                    pair.end = pair.start.clone().add(BREAK_AFTER - time_working);
                    pair.synthetic = true;
                    
                    pause_start = pair.end.clone()
                    pause_end = pause_start.clone().add(FIRST_BREAK - time_on_break);
                    
                    pairs.push({
                        'start': pause_start,
                        'end': pause_end,
                        'type': TYPE_ON_BREAK,
                        'synthetic': true,
                    });
                    
                    pairs.push({
                        'start': pause_end.clone(),
                        'end': null,
                        'type': TYPE_WORKING,
                        'synthetic': true
                    });
                } else if (time_working < SECOND_BREAK_AFTER &&
                    time_on_break < (FIRST_BREAK + SECOND_BREAK)) {
                    
                    pair.end = pair.start.clone()
                        .add(SECOND_BREAK_AFTER - time_working);
                    pair.synthetic = true;
                    
                    pause_start = pair.end.clone();
                    pause_end = pause_start.clone()
                        .add((FIRST_BREAK + SECOND_BREAK) - time_on_break);
                    
                    pairs.push({
                        'start': pause_start,
                        'end': pause_end,
                        'type': TYPE_ON_BREAK,
                        'synthetic': true
                    });
                    
                    pairs.push({
                        'start': pause_end.clone(),
                        'end': null,
                        'type': TYPE_WORKING,
                        'synthetic': true
                    });
                } else if (time_working < MAX_TIME) {
                    pair.end = pair.start.clone().add(MAX_TIME - time_working);
                    pair.synthetic = true;
                } else {
                    pair.end = pair.start.clone();
                }
            }
            
            if (sixHoursCheck(pair)) {
                pair.synthetic = true;
                pair_end = pair.end.clone();
                pair.end = pair.start.clone().add(BREAK_AFTER);

                var duration_break = (time_on_break < FIRST_BREAK ?
                        FIRST_BREAK - time_on_break : SECOND_BREAK),
                    new_pair = {
                        'start': pair.start.clone().add(BREAK_AFTER),
                        'end': pair.start.clone().add(BREAK_AFTER).add(duration_break),
                        'type': TYPE_ON_BREAK,
                        'synthetic': true,
                        'hula': 'NO'
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
                            'synthetic': true
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
                        'synthetic': true
                    },
                    pair_end = pair.end.clone();

                pair.synthetic = true;
                pair.end = new_pair.start.clone();
                
                if (new_pair.end >= pair_end) {
                    new_pair.end = pair_end;

                    pairs.splice(idx_p + 1, 0, new_pair);
                } else if (new_pair.end < pair_end) {
                    var new_new_pair = {
                            'start': new_pair.end.clone(),
                            'end': pair_end,
                            'type': TYPE_WORKING,
                            'synthetic': true
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
        
        console.log('PAIRS');
        for (idx_p = 0; idx_p < pairs.length; idx_p += 1) {
            pair = pairs[idx_p];
            console.log(pair.start.toString(), pair.end.toString(),
                pair.type, pair.synthetic, pair.hula);
        }
        
        return pairs;
    };
    
    for (idx_ts = 0; idx_ts < timeserieses.length; idx_ts += 1) {
        console.log('new timeseries');
        timeseries = timeserieses[idx_ts];
        check_result = checkTimeSeriesValidity(timeseries);
        valid = check_result === -1;
        
        if (valid === true) {
            var pairs = calcTimes(timeseries),
                pair, idx_pair;
            
            var time_working = 0,
                time_on_break = 0;
            
            for (idx_pair = 0; idx_pair < pairs.length; idx_pair += 1) {
                pair = pairs[idx_pair];
                
                if (pair.type === TYPE_WORKING) {
                    time_working += pair.end.diff(pair.start);
                } else {
                    time_on_break += pair.end.diff(pair.start);
                }
            }
            
            console.log('working', getReadableDiff(time_working));
            console.log('break', getReadableDiff(time_on_break));
        } else {
            prev_ts = timeseries[check_result - 1];
            ts = timeseries[check_result];
            
            if (prev_ts) {
                console.log('Invalid timeseries. Check positions ' + (check_result - 1) + ' and ' + check_result);
                console.log(prev_ts);
                console.log(ts);
            } else {
                console.log('Invalid timeseries. Check first element.');
                console.log(ts);
            }
        }
    }
}());