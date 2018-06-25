//app.js
var URLMap = require('config.js');
var nativeAPI = require('api/native.js');
var Promise = require('utils/lib/es6-promise.min.js');
var util = require('utils/util.js');
var debug = URLMap.debug;
var consoleLog = console.log;

App(Object.assign({
  debug:debug,
  localDataKey: 'jzyLoginTokenKey',//用户登陆信息本地存储key
  dkListUpdate:'dkListUpdate',//用户打卡信息有变化本地存储标识位
  localLogKey: 'jzy-localLogKey',//本地错误日志key
  appletNewTips:'appletNewTips',//小程序新功能上线提示标记
  appletRefreshTime:'appletRefreshTime',//小程序首页最后一次更新时间
  appletTrainRecordLable:'appletTrainRecordLable',//小程序运动打卡输入标签列表
  appletRecipeRecordLable:'appletRecipeRecordLable',//小程序餐食打卡输入标签列表
  onError( err ){
    this.errorLog({
      url:'appletNativeError',
      sersverData:JSON.stringify( err )
    });
  },
  onShow() {
    this.errorLog();
  },
  onLaunch() {
  },
  send(urlKey, data, method, header) {
    var ctx = this;
    header = header || {};
    header.timezone = (new Date()).getTimezoneOffset();
    header.protocolVersion = this.globalData.config.clientVersion;
    return new Promise((resolve, reject) => {
      var url = URLMap[urlKey] || urlKey;
      wx.getNetworkType({
        complete( net ){
          if (net.errMsg == 'getNetworkType:ok' && net.networkType != 'none'){
            wx.request({
              url: url,
              data: data || {},
              header: header || {},
              method: (method || 'POST').toUpperCase(),
              success(res) {
                res.net = net;
                debug && console.log([urlKey, res, header]);
                resolve(res);
              },
              fail(res) {
                res.net = net;
                debug && console.log({ statusCode: -405, desc: `${urlKey}接口调用失败！`, res: res, header});
                ctx.errorLog({
                  url: 'send-' + urlKey,
                  code:'requestError',
                  serverData: JSON.stringify(res)
                });
                reject({ statusCode: -405, desc: `${urlKey}接口调用失败！`, res: res });
              }
            });
          } else {
            reject({ statusCode: -500, desc: '无网络', net});
          }
        }
      });

    });
  },
  errorLog( params ){
    var ctx = this;
    var isLocal = false;//isLocal 本地缓存日志
    if (params){
      var { system, version, brand, model, SDKVersion, platform } = wx.getSystemInfoSync();
      if ( params.serverData ){
        params.serverData = params.serverData.substr(0,1000);
      }
      params = Object.assign(params, {
        topic: debug ? "topic-applet-browse" : "topic-applet-browse-online",
        _t: util.formatTime(Date.now(),'yyyy-MM-dd hh:mm:ss'),
        appletVersion: ctx.globalData.config.clientVersion,
        userId: params.userId || ctx.globalData.userId||'',
        token: ctx.globalData.token||'',
        system,
        version,
        brand,
        model,
        SDKVersion,
        platform
      });
      params = [params];
    } else {
      isLocal = true;
      params = ctx.getStorage(ctx.localLogKey, true) || [];
      if (params.length==0){
        return '';
      }
    }
    wx.request({
      url: URLMap['errorLog'],
      data: JSON.stringify(params),
      method: 'POST',
      header: {
        'content-type': 'application/json;charset=utf-8' // 默认值
      },
      complete(res) {
        if (res.statusCode != 200){//报错失败
          if (isLocal) return;
          //localLogKey
          var logs = ctx.getStorage(ctx.localLogKey,true)||[];
          logs.push( params[0] );
          var newLogs = [],figs={};
          logs.forEach(( item )=>{
            if( !figs[item.code] ){//一种错误只记录一次
              newLogs.push( item );
              figs[item.code] = 1;
            }
          });
          if (newLogs.length > 10 ){
            newLogs = newLogs.slice(logs.length-10, 10);
          }
          ctx.setStorage({
            key: ctx.localLogKey,
            data: newLogs
          },true);
        } else {//是本地日志发送成功，清空
          if (isLocal){
            ctx.setStorage({
              key: ctx.localLogKey,
              data: []
            }, true);
          } else {
            ctx.errorLog();
          }

          console.log('日志上报成功!');
        }
      }
    });
  },
  globalData: {
    config:{
      deviceType: 'wxapp',
      deviceID: Date.now(),
      clientVersion: '2.0.0.0',
      bearerToken:null,
      uploadConfig: 'normal',   //direct 直传七牛upload.qiniup.com    normal 普通上传
      cdnHost:'https://shopcdn2.rjfittime.com/', //CDN服务器地址
      qiniuHost:'https://o4wbikkhf.qnssl.com/',//七牛cdn服务地址
      aliyunOssCdnHost:'https://fop-fitcamp-resource.rjfittime.com/',
      aliyunOssCdnOriginalHost:'https://fop-fitcamp-resource-original.rjfittime.com/',
      allowPhoneChange: false, //是否允许强制绑定手机以及切换手机号
      aliAccessId: 'LTAInxlL6r5cfJPq',
      aliAccessKey: 'dk82Bg6LBbvDIAd3xYmAlGXomTraXB'
    },
    userId:'',
    uploadVideoCache:{}
  },
  clearCache() {
    this.globalData.detailPageTempData = null;
    this.globalData.detailPageTermData = null;
    this.globalData.applyRecord = null;
    this.globalData.planListData = null;//训练计划视频列表  供播放页面使用
    this.globalData.planListData_Plan = null;//点击训练计划视频列表  供播放页面使用
  },
  log(content){
    if(debug){
      consoleLog(content);
    }
  }
}, nativeAPI));