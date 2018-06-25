var app = getApp();
var util = require('../../../utils/util.js');
var URLMap = require('../../../config.js');
var PlayCache = require('../play/util/PlayCache.js');
const native = require('../../../api/native');
const PAGE_INFO = '/plan/resultNew/result.js';
const LEVLE_KEY = 'level';

const LEVLE_DESC_LIST = {
  0: '毫无感觉，心跳平稳',
  1: '心跳开始加快，呼吸顺畅',
  2: '勉强能不间断说出一个长句',
  3: '说话困难、心跳加快、呼吸沉重',
  4: '无法说话、心跳极快、无法呼吸'
};
const LEVEL_LABEL_LIST = {
  0:'超简单',
  1:'简单',
  2:'适中',
  3:'困难',
  4:'折磨'
};
const LEVEL_IMG_LIST = {
  0: '/img/level1.png',
  1: '/img/level2.png',
  3:'/img/level4.png',
  2: '/img/level3.png',
  4: '/img/level5.png'
};
const LEVEL_DEFAULT = '/img/level-default.png';

Page({
  data: {
    "motionNum": 0,//动作个数
    "duration": 0,//时长
    "consume": 0,//消耗卡路里
    'streakDayCount':0,//连续打卡天数
    'checkinCount': 0, // 连续打卡次数
    "pageType":"day",
    "loadend":false,
    cdnHost:app.globalData.config.cdnHost,
    isCheckedIned:false,
    select: false,
    level: -1,
    levelList: [LEVEL_DEFAULT, LEVEL_DEFAULT, LEVEL_DEFAULT, LEVEL_DEFAULT, LEVEL_DEFAULT],
    levelDesc: ' ', // 注意：这个空格不要去掉
    levelLabel: ''
  },
  options : null,
  onLoad: function (options) {
    this.options =options;

    let level = PlayCache.getLevel(void 0, LEVLE_KEY) || -1; // 如果是第一次进入这个页面那么等级初始化为-1
    let levelLabel = LEVEL_LABEL_LIST[level];
    this.setData({
      status: app.globalData.status,
      cdnHost: app.globalData.config.cdnHost,
      imgPath: '/img/trainingdk2.png',
      typeText: '运动打卡',
      level,
      levelLabel
    });

    // 这里将level传递到prepareRenderData方法内辅助判断
    options.level = level;

    //准备渲染的数据
    this.prepareRenderData(options);
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.onLoad(this.options);
  },
  initAudio(){
  },
  onReady(){
  },
  onShow: function () {
    if (this.data.generated) {
      setTimeout(() => {
        app.locationReplace('/pages/index/index');
      }, 100);
    }
  },
  //打卡并预览打卡图片
  js_previewAndCheckin(){
    var page = this;
    app.loading({
      title: '图片生成中。。。',
      mask: true
    });

    var param ={
      content:"",//打卡内容
      applyId:app.globalData.applyRecord.applyId,//报名id
      date:util.formatTime(new Date().getTime(), 'yyyy-MM-dd'),//客户端日期
      type:"TRAINING",//打卡类型
      originImageUrl: "/img/trainingdk2.png", // 后端会匹配图片路径中是否包含trainingdk2.png
      timezone:new Date().getTimezoneOffset(),//时区,
      isFromTrainningPlan:1,
      choose: page.data.level
    };

    /*******************以下为重试相关代码********************/
    let checkInRetry = util.retry(
      performCheckIn,
      errHandler,
      {retryCount: 1, log: true, wait: 2000, beforeRetry: (retryCount, currentCount) => {
        app.loading({
          title: '正在加载中...',
          mask: true
        });
      }});

    checkInRetry();

    //打卡
    function performCheckIn(retry) {
      app.send('checkinNew', param, 'POST', {
        "content-type": "application/x-www-form-urlencoded",
        'x-rjft-request': 'native',
        'Authorization': `Bearer ${app.globalData.token}`,
        'clientVersion': `${app.globalData.config.clientVersion}`
      }).then((res) => {
        var retcode = parseInt((res.data||{}).retcode);
        page.generating =false;
        if (retcode == 400) {
          app.loading();
          app.alert('已完成打卡');
          setTimeout(() => {
            app.locationReplace('/pages/index/index');
          }, 1000);
          return;
        } else if (retcode != 200 || !(res.data||{}).object){
          retry(null, res);
          return;
        }

        //下载并预览图片
        var imgUrl = res.data.object;
        page.downloadAndPreviewImg(imgUrl);

        //更新本地打卡记录
        app.setStorage({
          key: app.dkListUpdate,
          data: 1
        }, true);

        // 此时设置打卡状态
        page.setData({
          isCheckedIned: true
        });
      }).catch(function( err ) {
        retry(err, null);
      });
    }

    // 错误处理方法，发送错误日志，弹框提示用户错误信息
    function errHandler(err, res) {
      page.generating = false;

      app.loading();

      let code = '83004', errMsg = `打卡失败(${code})`, serverData = err || {};
      if (res && (!res.data || !res.data.object)) {
        code = '83002';
        errMsg = (((res && res.data) || {}).retdesc || '打卡失败') + code;
        serverData = res;
      }

      app.alert(errMsg);
      app.errorLog({
        url: 'checkin',
        code,
        page: PAGE_INFO,
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(serverData)
      });
    }
  },
  //操作提示
  js_operateTip() {
    console.log('operateTIp:'+this.data.isCheckedIned);
    if (this.data.isCheckedIned){
      return;
    }
    if (this.generating) {
      return;
    }
    this.generating = true;

    if (wx.getStorageSync('training-tiped') + "" == "true") {
      this.js_previewAndCheckin();
    } else {
      this.setData({
        showMask: true
      })
      wx.setStorageSync('training-tiped', true);
    }
  },
  //准备渲染的数据
  prepareRenderData(options) {
    // 如果已经完成了一次基础训练
    let isEnd = !!options.isEnd;
    // 如果完成了一次基础训练，或者之前没有选择过等级，都要弹框
    this.setData({
      select: !isEnd || options.level < 0
    });

    this.getStreakDayCount((data) => {
      this.setData({
        networkType:'',
        loadend:true,
        streakDayCount: data.streakDayCount,
        checkinCount: data.checkinCount,
        isCheckedIned: data.isCheckedIned,
        motionNum: options.motionNum,
        duration: options.duration,
        consume: options.consume,
        pageType:options.type||'day'
      });
    });
  },
  //获得连续打卡天数
  getStreakDayCount(fn){
    var page = this;
    app.loading('加载中...');
    var promise= app.send('checkinStatus', {}, 'GET', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    });
    promise.then((res) => {
      app.loading();
      var lastCheckinDate = res.data.object.lastCheckinStreakDate || 0;
      // 连续满卡天数
      var streakDayCount = res.data.object.streakDayCount ? parseInt(res.data.object.streakDayCount) : 0;
      // 连续打卡次数
      var checkinCount = res.data.object.checkinCount ? parseInt(res.data.object.checkinCount) : 0;
      var yestoday = util.formatTime(new Date().getTime() - 24 * 60 * 60 * 1000, 'yyyy-MM-dd');
      if (lastCheckinDate == yestoday) {
        streakDayCount++;
      } else if (lastCheckinDate < yestoday) {
        streakDayCount = 1;
      }
      // 今天是否已经运动打卡
      var ifTodayTrainningCheckin = res.data.object.ifTodayTrainningCheckin;
      fn({
        streakDayCount,
        checkinCount: ++checkinCount,
        isCheckedIned: ifTodayTrainningCheckin
      });
    });
    promise.catch(err=>{
      app.loading();
      console.log(err);
      if( err.statusCode == -500 ){
        this.setData({
          networkType: 'none'
        });
      } else {
        app.alert('服务异常!(60000)');
        app.errorLog({
          url: 'checkinStatus',
          code: '60000',
          type:'sport',
          page: PAGE_INFO,
          serverData: JSON.stringify(err)
        });
      }
    });
  },
  //下载并预览图片
  downloadAndPreviewImg(imgUrl){
    var page = this,
      imgUrls = []; // 这个数组用户上传错误日志;

    /*以下为重试相关代码*/
    let imgDownload = util.retry(
      performImgDownload,
      errHandler,
      {retryCount: 1, log: true, wait: 2000, beforeRetry: (retryCount, currentCount) => {
        imgUrls.push(imgUrl);
        imgUrl = imgUrl.replace(
          app.globalData.config.aliyunOssCdnHost,
          app.globalData.config.aliyunOssCdnOriginalHost);
      }});
    imgDownload();

    function performImgDownload(retry, currentCount) {
      wx.getImageInfo({
        src:imgUrl,
        success(res) {
          page.setData({
            generated:true
          });

          previewImage(res);

          // 重试成功时，也要上传日志
          if (currentCount) {
            app.errorLog({
              url: 'downloadAndPreviewImgRetrySuccess',
              page: PAGE_INFO,
              code: '83001',
              imgUrls: JSON.stringify(imgUrls),
              serverData: JSON.stringify(res)
            });
          }
        },
        fail( err ){
          retry(err, null);
        }
      })
    }

    function errHandler(err, res) {
      app.loading();

      // 如果更换cdn地址后重试，再失败则直接previewImage
      previewImage({
        path: imgUrl
      });

      imgUrls.push(imgUrl); // 把最后一次请求的图片地址也上传上去
      app.errorLog({
        url: 'downloadAndPreviewImgError',
        page: PAGE_INFO,
        code: '83001',
        imgUrls: JSON.stringify(imgUrls),
        serverData: JSON.stringify(err)
      });
    }

    // 预览图片
    function previewImage(res) {
      app.loading();

      wx.previewImage({
        current: res.path,
        urls: [res.path], // 需要预览的图片http链接列表
        success() {
          page.setData({
            generated:true
          });
        },
        fail(err) {
          page.setData({
            generated:true
          });

          app.errorLog({
            url: 'previewImageImgError',
            page: PAGE_INFO,
            code: '83001',
            imgUrls: JSON.stringify(imgUrls),
            serverData: JSON.stringify(err)
          });
        }
      })
    }
  },
  js_again(){
    PlayCache.removeCache(this.options.type, this.options.key);
    app.redirectTo(`/pages/plan/play/play?type=${this.data.pageType}`);
  },
  utils:{
    //秒转分钟
    seconds2Minutes(secondNum){
      return secondNum%60?(secondNum/60 + 1 ):secondNum/60;
    }
  },
  level(e) {
    let level = e.currentTarget.dataset.level; // 感受等级
    let levelLabel = LEVEL_LABEL_LIST[level];
    let levelDesc = LEVLE_DESC_LIST[level];
    let levelImg = LEVEL_IMG_LIST[level];
    let levelList = [];
    // 先填充带表情图标
    for (let i = 0; i < 5 - level; i++) {
      levelList.push(levelImg);
    }
    // 后填充无表情图标
    for (let i = 5 - level; i < 5; i++) {
      levelList.push(LEVEL_DEFAULT);
    }

    this.setData({levelList, levelDesc, level, levelLabel});
  },
  levelSelected() {
    let level = this.data.level;
    if (level < 0) {
      native.toast({
        icon: 'none',
        title: '请选择运动感受程度'
      });
      return;
    }

    this.setData({select: false});

    // 缓存用户首次选择的感受程度
    PlayCache.setLevel(void 0, LEVLE_KEY, level);
  }
});