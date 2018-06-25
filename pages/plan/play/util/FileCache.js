var app = getApp();
var util = require('../../../../utils/util.js');
var Promise = require('../../../../utils/lib/es6-promise.min.js');
var uploadVideoCache  = app.globalData.uploadVideoCache;
var cacheTime = 3*60*1000;//缓存时间
var hostList = [];
module.exports = {
  getLocalUrl(url) {
    var cache = uploadVideoCache;
    var key = encodeURIComponent(url);
    var context = this;
    if (hostList.length==0){
      hostList = [app.globalData.config.cdnHost, app.globalData.config.qiniuHost];
    }
      
    return new Promise((resolve, reject) => {
      /*return setTimeout(()=>{
        resolve({ code: 200, url: url });
      });*/
      if (cache[key] && Date.now() - cache[key].time <= cacheTime) {
        console.log('有文件缓存' + cache[key].url);
        resolve({ code: 200, url: cache[key].url });
      } else {
        console.log('开始下载：'+url);
        context.downFile(url.replace(hostList[1], hostList[0]), key, cache, resolve);
      }
    });
  },
  downFile(url, key, cache, resolve) {
    let downloadFileRetry = util.retry(
      performDownloadFile,
      errorHandler,
      {retryCount: 1, log: true, wait: 2000, beforeRetry: (retryCount, currentCount, result) => {
        // 每次重试先记日志
        app.errorLog({
          url: 'downloadVideoFail',
          videoUrl: url,
          page: '/plan/util/FileCache.js',
          code: '30201',
          count: currentCount,
          userId: app.globalData.userId || '',
          serverData: JSON.stringify(((result || {}).err)|| {})
        });

        // 然后这里切换cdn
        url = url.replace(
          hostList[0],
          hostList[1]
        );
      }}
    );
    downloadFileRetry();

    function performDownloadFile(retry, currentCount) {
      app.downloadFile(url).then(res => {
        if (res.statusCode === 200) {
          console.log(['下载成功', '原：'+url, '下载后:'+res.tempFilePath]);
          cache[key] = { url: res.tempFilePath, time:Date.now() };
          resolve({ code: 200, url: res.tempFilePath });

          // 如果重试成功也要上传重试成功日志
          if (currentCount){
            app.errorLog({
              url: 'downloadVideoRetrySuccess',
              videoUrl: url,
              page: '/plan/util/FileCache.js',
              code: '30201',
              count: currentCount,
              userId: app.globalData.userId || '',
              serverData: JSON.stringify(res)
            });
            hostList = [hostList[1], hostList[0]];
          }

        } else {
          retry(null, res);
        }
      }).catch(err => {
        retry(err, null);
      });
    }

    function errorHandler(err, res, currentCount) {
      let serverData = (err || res) || {};

      app.getNetworkType().then(res => {
        console.log(['下载失败catch,网络:' + res.networkType, url, serverData]);
        resolve({ code: res.networkType == 'none' ? 500 : 201, url: url });
        res.networkType != 'none' && app.errorLog({
          url: 'downloadFile_Error',
          videoUrl: url,
          networkType: res.networkType,
          code: res.networkType == 'none' ? 30500 : 30201,
          count: currentCount,
          userId: app.globalData.userId || '',
          serverData: JSON.stringify(serverData).substr(0, 500)
        });
      });
    }
  },
  getCacheStatus( url ){
    var cache = uploadVideoCache;
    var key = encodeURIComponent(url);
    return new Promise((resolve, reject)=>{
      if (cache[key] && Date.now()-cache[key].time<=cacheTime) {
        resolve({ code: 200, url: cache[key].url });
      } else {
        setTimeout(()=>{
          resolve({
            code: 404,
            url: url
          })
        },50)
      }
    })
  }
}