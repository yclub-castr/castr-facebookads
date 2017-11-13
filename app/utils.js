// app/utils.js

'use strict';

const tracer = require('tracer');
const moment = require('moment-timezone');

// Tracer - logger
const logger = tracer.console({
    format: '[{{timestamp}}] <{{title}}> {{message}} - ({{file}}:{{line}})',
    dateformat: 'mmm. d | HH:MM:ss.L',
    level: 'debug',
});

// Moment - date wrapper
moment.locale('kr', {
    months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    // "monthsShort": RESERVED FOR ENGLISH ABBREVIATED MONTHS
    weekdays: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
    // "weekdaysShort": RESERVED FOR ENGLISH ABBREVIATED WEEKDAYS
    weekdaysMin: ['월', '화', '수', '목', '금', '토', '일'],
    longDateFormat: {
        LT: 'A h:mm',
        LTS: 'A h:mm:ss',
        L: 'YYYY/MM/DD',
        LL: 'YYYY년 M월 D일',
        LLL: 'YYYY년 M월 D일 LT',
        LLLL: 'YYYY년 M월 D일 dddd LT',
    },
    meridiem(hour, minute, isLowercase) {
        if (hour < 12) {
            return '오전';
        }
        return '오후';
    },
});
moment.locale('en');

class RandomRatio {
    constructor(numRands) {
        this.randomTokens = [];
        this.sum = 0;
        this.counter = 0;
        for (let i = 0; i < numRands; i++) {
            const randTok = Math.random();
            this.sum += randTok;
            this.randomTokens.push(randTok);
        }
    }

    hasNext() {
        if (this.counter < this.randomTokens.length) return true;
        return false;
    }

    next() {
        const nextPart = this.randomTokens[this.counter] / this.sum;
        this.counter += 1;
        return nextPart;
    }

    distribute(sum) {
        const distribution = [];
        while (this.hasNext()) distribution.push(Math.round(sum * this.next()));
        return distribution;
    }
}

module.exports = {
    logger() { return logger; },
    moment() { return moment; },
    RandomRatio: RandomRatio,
};
