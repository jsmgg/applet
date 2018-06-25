var app = getApp();
module.exports = {
  formatTime( time, format ) {
    var dt = new Date( parseInt(time, 10) );
    var date = {
      "M+": dt.getMonth() + 1,
      "d+": dt.getDate(),
      "h+": dt.getHours(),
      "m+": dt.getMinutes(),
      "s+": dt.getSeconds(),
      "q+": Math.floor((dt.getMonth() + 3) / 3),
      "S+": dt.getMilliseconds()
    };
    if (/(y+)/i.test(format)) {
      format = format.replace(RegExp.$1, (dt.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in date) {
      if (new RegExp("(" + k + ")").test(format)) {
        format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? date[k] : ("00" + date[k]).substr(("" + date[k]).length));
      }
    }
    return format;
  },
  rpx_to_px(rpx, windowWidth) {//1rpx=0.5px  iphone6下
    return windowWidth / 375 * rpx * 0.5;
  },
  // 返回指定函数的，重试版本
  retry(func, errHandler, {retryCount, log, wait, beforeRetry} = {retryCount: 1, log: false, wait: 0, beforeRetry}) {
    if (!this.isFunction(func)) {
      throw new TypeError('func must be function!');
    }
    if (!this.isFunction(func)) {
      throw new TypeError('errHandler must be function!');
    }

    const self = this;
    const RETRY_COUNT = retryCount; // 总重试次数
    let currentCount = 0; // 当前重试次数

    // 判断是否给定了合法的beforeRetry
    let isBeforeRetry = self.isFunction(beforeRetry);

    // 将wait参数合法化
    wait = self.isNumber(wait) ? Math.min(10000, Math.max(0, wait)) : 0;

    function next(err, data) {
      // 如果尝试最后一次失败，则进行错误处理
      if (currentCount++ > RETRY_COUNT) {
        errHandler(err, data, currentCount - 1);
      } else {
        perform(retry);
      }

      function retry(err, data) {
        // 只有处于重试阶段才执行
        if (currentCount > 0 && currentCount <= RETRY_COUNT) {
          // 打印日志
          if (log) {
            self.isObject(err) && console.log(JSON.stringify(err));
            self.isObject(data) && console.log(JSON.stringify(data));
          }

          // retry前操作
          if (isBeforeRetry) {
            beforeRetry(RETRY_COUNT, currentCount, {err, data});
          }
        }

        next(err, data);
      }
    }

    function perform(retry) {
      if (wait && currentCount > 1) {
        setTimeout(function() {
          func(retry, currentCount);
        }, wait);
      } else {
        func(retry);
      }
    }

    return next;
  },
  isFunction(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  },
  isObject(obj) {
    return typeof obj === 'function' || typeof obj === 'object' && !!obj;
  },
  isNumber(obj) {
    return Object.prototype.toString.call(obj) === '[object Number]';
  },
  isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  },
  isNull(obj) {
    return obj === null;
  },
  isString(obj) {
    return Object.prototype.toString.call(obj) === '[object String]';
  },
  // 是否是本地默认打卡图片
  isDefaultRecordImage(imgPath) {
    return imgPath && imgPath.startsWith('/img');
  },
  toFixed(value, offset) {
    value = Number(value) || 0;
    return Number(value.toFixed(offset));
  }
};
