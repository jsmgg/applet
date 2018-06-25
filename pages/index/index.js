// jzyDetail.js
var app = getApp();
var Util = require('../../utils/util.js');
var URLMap = require('../../config.js');
var AppInit = require('appInit.js');
var oneDay = 24 * 60 * 60 * 1000;
var cacheTime = 60 * 60 * 1000;

const TARGET_PROGRESS_CANVAS_WIDTH = 360;
const TARGET_PROGRESS_DIAMETER = 333;
const TARGET_PROGRESS_RADIUS = TARGET_PROGRESS_DIAMETER / 2;
const TARGET_PROGRESS_LINE_WIDTH = 24;
const TARGET_COLORS = ['#00a67c', '#94de5e'];
const CHECKIN_EMPTY_COLOR = '#f2f2f2';

Page({
  data:{
    cdnHost:app.globalData.config.cdnHost,
    status:0,//1为报名，2未开营，3正常开营   -1 异常情况
    showCard:0,//是否显示卡片
    showApplyTips:0,
    showCardTips:0,
    courseId : 0,
    dkend:1,
    client:'',
    version: 'v' + app.globalData.config.clientVersion,
    servicesEnd: 0,
    statusCode:'',
    loadEnd:false,
    phoneChangeView:false,
    mobile:'',
    updateMobile:'',
    forceMigrate:0,
    showCanvas:true
  },
  onPullDownRefresh() {
    this.onLoad( this.params );
    setTimeout(()=>{
      wx.stopPullDownRefresh();
    },1000)
  },
  params:{},
  onReachBottom(){},
  campStartTime:0,
  applyId:0,
  userId:0,
  typeMap:{},
  dietLevel:0,
  /*
    @params
      refresh
  */
  onLoad( params ){
    this.params = params;
    var jzyUserToken = app.getStorage(app.localDataKey, true);
    AppInit.load( params , ( res )=>{
      //wx.stopPullDownRefresh();
      app.loading();
      var { system, version, windowWidth } = wx.getSystemInfoSync();
      var client = /^android/i.test(system)?'and':'';
      if( res.status == 2 || res.status==3 ) {
        this.campStartTime = res.term.campStartTime;
        this.applyId = res.applyRecord.applyId;
        this.userId = res.userId;
        this.dietLevel = res.dietLevel;
      }
      app.globalData.userId = res.userId || jzyUserToken.userID ||'';
      app.globalData.status = res.status; // 开营状态
      var data = res.status <= 1 ? { status: res.status}:this.formatData(res);
      data.client = client;
      data.version = 'v' + app.globalData.config.clientVersion + '.' + version + '.' + (app.globalData.userId||'0');
      data.statusCode = res.statusCode||'';//判断断网使用
      data.cdnHost = app.globalData.config.cdnHost;
      data.forceMigrate = parseInt(this.params.forceMigrate)?1:0;
      data.updateMobile = this.params.mobile||'';
      data.loadEnd = true;
      this.data.windowWidth = windowWidth;
      this.params.forceMigrate = '';//这里只需要使用一次
      this.params.mobile = '';//这里只需要使用一次
      this.setData( data );
      app.setStorage({ key: app.appletRefreshTime,data:Date.now()});

      // 绘制进度
      this.drawTargetProgress(data.reducePercent);
    });
    app.errorLog();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    var fig = app.getStorage(app.dkListUpdate,true);
    var prevTime = app.getStorage(app.appletRefreshTime,true);
    var refresh = prevTime && (Date.now() - prevTime > cacheTime) && this.data.loadEnd;
    if (fig || refresh){
      this.onLoad({ refresh: false });
      app.removeStorage({ key: app.dkListUpdate}, true);
    }
  },
  drawTargetProgress(percent) {
    let ctx = wx.createCanvasContext('progress');

    // 重置坐标轴
    this.resetTargetProgressCoordinate(ctx);

    // 先绘制空进度
    this.drawTargetEmptyProgress(ctx);
    // 绘制减重进度
    if (percent) {
      this.drawTargetCompleteProgress(ctx, TARGET_COLORS, percent);
    }

    ctx.draw();
  },
  resetTargetProgressCoordinate(ctx) {
    // 重置坐标轴
    ctx.translate(
      this.toPx(TARGET_PROGRESS_CANVAS_WIDTH / 2),
      this.toPx(TARGET_PROGRESS_CANVAS_WIDTH / 2));
    ctx.rotate(0.5 * Math.PI);
  },
  drawTargetEmptyProgress(ctx) {
    this.drawTargetProgressArc(ctx, CHECKIN_EMPTY_COLOR, 0.2 * Math.PI, 1.8 * Math.PI);
  },
  drawTargetProgressArc(ctx, style, from, to) {
    ctx.setStrokeStyle(style);
    ctx.setLineWidth(this.toPx(TARGET_PROGRESS_LINE_WIDTH));
    ctx.setLineCap('round');
    ctx.beginPath();
    ctx.arc(0, 0, this.toPx(TARGET_PROGRESS_RADIUS), from, to, false);
    ctx.stroke();
  },
  drawTargetCompleteProgress(ctx, colors, progress) {
    // 如果百分比大于50%，则分段画圆
    if (progress > 0.5) {
      // 计算中间色
      let middleColor = this.calcMiddleColor(colors, progress);
      let tmpColors = [].concat(colors);
      tmpColors.splice(1, 0, middleColor);

      // 渐变角度
      let lgs = this.genTargetStageGradient(ctx, tmpColors, progress);

      // 先画第一段
      this.drawTargetProgressArc(ctx, lgs[0], 0.2 * Math.PI, Math.PI);
      // 再画第二段
      this.drawTargetProgressArc(ctx, lgs[1], Math.PI, (0.2 + 1.6 * progress) * Math.PI);

      // 否则直接画一段
    } else {
      // 渐变角度
      let lg = this.genTargetSingleGradient(ctx, colors, progress);

      this.drawTargetProgressArc(ctx, lg, 0.2 * Math.PI, (0.2 + 1.6 * progress) * Math.PI);
    }
  },
  calcMiddleColor(colors, progress) {
    let start = this.colorRgb(colors[0]);
    let end = this.colorRgb(colors[1]);

    return 'rgb(' + [
      Math.floor(this.calcMiddleValue(start[0], end[0], progress)),
      Math.floor(this.calcMiddleValue(start[1], end[1], progress)),
      Math.floor(this.calcMiddleValue(start[2], end[2], progress))
    ].join(',') + ')';
  },
  calcMiddleValue(start, end, progress) {
    let min, max;
    if (start > end) {
      min = end;
      max = start;
    } else {
      min = start;
      max = end;
    }

    return min + (max - min) * (progress - 0.5) / progress;
  },
  colorRgb(hex) {
    var sColor = hex.toLowerCase();
    //十六进制颜色值的正则表达式
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    // 如果是16进制颜色
    if (sColor && reg.test(sColor)) {
      if (sColor.length === 4) {
        let sColorNew = "#";
        for (let i = 1; i < 4; i += 1) {
          sColorNew += sColor.slice(i, i+1).concat(sColor.slice(i, i+1));
        }
        sColor = sColorNew;
      }
      //处理六位的颜色值
      let sColorChange = [];
      for (let i=1; i<7; i+=2) {
        sColorChange.push(parseInt("0x"+sColor.slice(i, i+2)));
      }
      // return "RGB(" + sColorChange.join(",") + ")";
      return sColorChange;
    }
    return sColor;
  },
  genTargetStageGradient(ctx, colors, progress) {
    let startGa = 0.2 * Math.PI, endGa = (0.2 + 1.6 * progress) * Math.PI;

    // 第一段的渐变
    let firstColors = colors.slice(0, 2);
    let lg1 = ctx.createLinearGradient(
      TARGET_PROGRESS_RADIUS * (Math.cos(startGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(startGa)),
      -TARGET_PROGRESS_RADIUS,
      0);
    lg1.addColorStop(0.2, firstColors[0]);
    lg1.addColorStop(0.79, firstColors[1]);

    // 第二段的渐变
    let secondColors = colors.slice(1, 3);
    let lg2 = ctx.createLinearGradient(
      -TARGET_PROGRESS_RADIUS,
      0,
      TARGET_PROGRESS_RADIUS * (Math.cos(endGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(endGa)));
    lg2.addColorStop(0.21, secondColors[0]);
    lg2.addColorStop(1, secondColors[1]);

    return [lg1, lg2];
  },
  genTargetSingleGradient(ctx, colors, progress) {
    let startGa = 0.2 * Math.PI, endGa = (0.2 + 1.6 * progress) * Math.PI;

    let lg = ctx.createLinearGradient(
      TARGET_PROGRESS_RADIUS * (Math.cos(startGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(startGa)),
      TARGET_PROGRESS_RADIUS * (Math.cos(endGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(endGa)),);
    lg.addColorStop(0, colors[0]);
    lg.addColorStop(1, colors[1]);

    return lg;
  },
  toPx(rpx) {
    let windowWidth = this.data.windowWidth;
    return Util.rpx_to_px(rpx, windowWidth);
  },
  /*
    params: statys: 1\2\3
    term:{}
  */
  formatData(params) {
    let {avatarUrl,nickname,status,courseId,isTest,addBodyFirst,showCard,unRead,termName,weight,firstWeight,targetWeight,checkinStatusForUser, leftDays, canBodyDataAndTest} = params;

    let data = {
                status,
                courseId,
                isTest,
                addBodyFirst,
                showCard,
                avatarUrl,
                nickname,
                unRead,
                termName,
                weight,firstWeight,targetWeight,checkinStatusForUser,
                leftDays,
                canBodyDataAndTest,
                showApplyTips: 0,
                showCardTips: 0,
                hasCard: 0,
                servicesEnd: Date.now() > (this.campStartTime + oneDay * params.term.days) ? 1 : 0
              };

    // 以下处理目标相关数据
    let targetData = this.initTargetData({ weight, firstWeight, targetWeight });
    data.reduceValue = targetData.reduceValue;
    data.reduceInfo = targetData.reduceInfo;
    data.reduceDiffTip1 = targetData.reduceDiffTip1;
    data.reduceDiffValue = targetData.reduceDiffValue;
    data.reduceDiffTip2 = targetData.reduceDiffTip2;
    data.reducePercent = targetData.reducePercent;

    return data;
  },
  initTargetData(targetData) {
    if (!targetData) {
      return;
    }

    let current = parseFloat(targetData.weight); // 当前
    let original = targetData.firstWeight; // 入营
    let target = targetData.targetWeight; // 目标

    if (!current || !original || !target) {
      return {
        reduceValue: Util.toFixed(0, 1),
        reduceInfo: '已减重(kg)',
        reduceDiffTip1: '离目标还差',
        reduceDiffValue: Util.toFixed(0, 1),
        reduceDiffTip2: 'kg',
        reducePercent: Util.toFixed(0, 1)
      };
    }

    let reduceValue = original - current,
      reduceInfo = '';
    if (reduceValue >= 0) {
      reduceInfo = '已减重(kg)';
    } else {
      reduceValue = -reduceValue;
      reduceInfo = '已增重(kg)';
    }
    targetData.reduceValue = reduceValue.toFixed(1);
    targetData.reduceInfo = reduceInfo;

    let diffValue = Util.toFixed(current, 1) - Util.toFixed(target, 1),
      reduceDiffTip1 = '', reduceDiffTip2 = '', reduceDiffValue = 0;
    if (diffValue > 0.0) {
      reduceDiffTip1 = '离目标还差';
      reduceDiffValue = diffValue;
      reduceDiffTip2 = 'kg';
    } else if (diffValue === 0.0) {
      reduceDiffTip1 = '刚好达成目标';
    } else {
      reduceDiffTip1 = '超出目标';
      reduceDiffValue = -diffValue;
      reduceDiffTip2 = 'kg';
    }
    targetData.reduceDiffTip1 = reduceDiffTip1;
    targetData.reduceDiffValue = reduceDiffValue ? reduceDiffValue.toFixed(1) : '';
    targetData.reduceDiffTip2 = reduceDiffTip2;

    current = Math.max(Math.min(current, original), target); // 将当前值收缩到原始或目标
    targetData.reducePercent = diffValue === 0.0 ? 1 :
      Math.abs(original - current) / Math.abs(original - target);

    return targetData;
  },
  getDayNum( campStartTime ){
    let cut = campStartTime - Date.now();
    return Math.ceil(cut / oneDay );
  },
  getDayTips( term ){
    let { days, campStartTime } = term;
    let start = Util.formatTime(campStartTime,'MM月dd日');
    let end = Util.formatTime(campStartTime + days * oneDay, 'MM月dd日');
    return start+'-'+end;
  },
  onShareAppMessage() {
    return {
      title: '口袋减脂营训练计划',
      desc: '口袋减脂营训练计划',
      path: '/pages/index/index',
      success(res) {
        app.toast('转发成功!');
        //console.log(res);
      }
    }
  },
  js_cards(){
    //return app.location('/pages/personal/test/test');
    var params = `applyId=${this.applyId}&userId=${this.userId}&dietLevel=${this.dietLevel}&courseId=${this.data.courseId}`;
    if (this.data.status == 3 && this.data.servicesEnd==0) {
      app.location('/pages/cards/cards?' + params);
    } else {
      this.setData({
        showCardTips: !this.data.showCardTips
      });
    }
  },
  js_target_index(){
    app.location('/pages/personal/target/target')
  },
  js_personal_index(){
    this.setData({
      rankFig: false
    });
    app.setStorage({
      key: app.appletNewTips,
      data:1
    }, true);
    app.location('/pages/personal/index/index');
  },
  js_sport(e) {
    if( this.data.courseId ){
      app.location('/pages/plan/index/index?applyId='+this.applyId);
    } else {
      this.setData({
        showCardTips:0
      });

      this.js_clear_appletRefreshTime(); // 这里清除上次请求的时候，如果点击左上角返回到首页，则需刷新

      let src = URLMap.H5_testpage;
      app.location('/pages/webview/index?src=' + decodeURIComponent( src ));
    }
  },
  js_diet(e){
    app.location(`/pages/diet/list/list?dietLevel=${this.dietLevel}`);
  },
  js_applyTips(){
    if ( app.globalData.config.allowPhoneChange ){
      if (this.data.phoneChangeView){
        this.setData({
          phoneChangeView: !this.data.phoneChangeView
        })
      } else {
        app.loading('加载中...')
        app.send('getUserMobile', {},'get', {
          'x-rjft-request': 'native',
          'Authorization': `Bearer ${app.globalData.token}`
        }).then(res=>{
          app.loading();
          this.setData({
            phoneChangeView: true,
            mobile: res.data.phoneNum||''
          });
          if (!res.data || !res.data.phoneNum){
            app.errorLog({
              url: 'getUserMobile',
              code: 80014,
              serverData: JSON.stringify(res)
            })
          }
        }).catch(err=>{
          app.loading();
          app.alert('获取用户信息失败(80013)');
          app.errorLog({
            url:'getUserMobile',
            code: 80013,
            serverData:JSON.stringify(err)
          })
        })
      }
    } else {
      this.setData({
        showApplyTips: !this.data.showApplyTips
      });
    }
  },
  js_changeMobile() {
    this.setData({
      phoneChangeView: false
    });
    app.locationReplace('/pages/bindMobile/bindMobile?action=merge&forceMigrate=1');
  },
  js_clear_dialog( e ){
    this.setData({
      showCardTips: 0
    });
  },
  js_input_view(e) {
    if (!this.data.canBodyDataAndTest) {
      app.alert(`距开营还有${this.data.leftDays}天，您的专属管理师届时会联系您`);
      return;
    }

    let type = e.currentTarget.dataset.type;
    let src = URLMap.H5_testpage;
    if( type == 'bodydata') {
      src = URLMap.H5_bodydata;
    }
    app.location('/pages/webview/index?src=' + decodeURIComponent( src ));
    // 点击"录入维度"时，清除上次刷新时间，这样回到首页时实时刷新红点
    this.js_clear_appletRefreshTime();
  },
  js_clear_appletRefreshTime() {
    app.setStorage({ key: app.appletRefreshTime, data: 1 });
  },
  js_showdk_view( e ){
    let type = e.currentTarget.dataset.type;
    this.location(type);
  },
  js_closeBackView(){
    this.setData({
      forceMigrate:0
    });
  },
  location(type) {
    if (type === 'training') { // 如果是运动打卡
      app.location(`/pages/recordNew/train/edit/edit`);
    } else { // 否则就是饮食打卡
      app.location(`/pages/recordNew/food/edit/edit?type=${type}`);
    }
  },
  js_cancelCardlist(){
    this.setData({ showCardList: 0 });

    setTimeout(() => {
      this.setData({ showCanvas: true });
    }, 10);
  },
  js_showdklist(){
    if( this.data.servicesEnd == 1 ) {
      this.js_target_index();
    } else {
      app.loading( '加载中...' );
      app.send('checkinRecords', {
        date: Util.formatTime(Date.now(), 'yyyy-MM-dd'),
        applyId: this.applyId,
        'timezone': (new Date()).getTimezoneOffset()
      }, 'get').then(res => {
        app.loading();
        var scoreMap={
          breakfast:5,
          lunch:5,
          dinner:5,
          training:10,
          bodydata:15
        };
        var titleMap={
          breakfast:'能量早餐',
          lunch:'活力午餐',
          dinner:'营养晚餐',
          training:'科学运动'
        };
        var typeArr = ['breakfast','lunch','dinner','training'];
        var typeMap = {};
        var data = [];
        if (res.data.retcode == 200) {
          var obj = res.data.list || [];
          obj.forEach(item => {
            var key = item.type.toLocaleLowerCase();
            typeMap[key] = 1;
          });
          //var list = this.getList(typeMap, runNumber);
          for (let i = 0, len = typeArr.length; i < len; i++) {
            let type = typeArr[i];
            if (type === 'training' && !this.data.courseId) {
              continue;
            }

            data.push({
              type:type,
              status:typeMap[type]?1:0,
              title : titleMap[type],
              score:scoreMap[type]
            })
          }

          this.setData({
            cardList : data,
            showCardList:1,
            showCanvas:false
          });
        } else {
          app.errorLog({
            url: 'checkinRecords',
            code: 'cardsPage',
            page:'index',
            serverData: JSON.stringify(res)
          });
          app.alert(res.data.desc || '数据刷新失败');
        }
      }).catch(err => {
        app.loading();
        if (err.statusCode == -500) {
          this.setData({ netError: 1, loadend: 1 });
        } else {
          app.errorLog({
            url: 'checkinRecords',
            code: 'cardsPageCatch',
            page:'index',
            serverData: JSON.stringify(err)
          });
          app.alert('服务异常');
        }
      });
    }
  }
})