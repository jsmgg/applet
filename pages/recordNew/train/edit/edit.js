/**********工具**********/
const app = getApp();
const Util = require('../../../../utils/util.js');
const checkInUtils = require('../../../../utils/checkinUtil');
const native = require('../../../../api/native');
const URLMap = require('../../../../config.js');

/**********常量**********/
const locakKey = app.appletTrainRecordLable;
const PAGE_INFO = '/recordNew/train/edit/edit.js';

var nums = (()=>{
  let arr = [],i=0;
  while(i<1000){
    arr.push(i++);
  }
  return arr;
})();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    searchView:false,
    delView:false,
    renderLayer: false, // 控制蒙层渲染
    showLayer: false, // 控制蒙层显隐
    unitsView:false, // 控制编辑框显隐
    nums: nums,
    imgPath:'',
    selectedList:[],
    serachList: [],//搜索出来的动作列表
    keyword:'',
    focusIn:false,
    train:{},//当前选中的运动
    kcal:0,//卡路里
    minutes:0,//分钟数
    showTag: 0,//0:不显示添加自定义 1:显示添加为自定义
    listHeight:0, //搜索列表高度
    focusFlag: false, // input的焦点
    renderSearch: false // 控制搜索列表的显隐
  },
  historyList : [],

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let { windowHeight, windowWidth } = wx.getSystemInfoSync();
    this.windowHeight = windowHeight;
    this.windowWidth = windowWidth;
    this.horizontal = windowWidth;
    this.vertical = Util.rpx_to_px(630, windowWidth);
    this.historyList = app.getStorage(locakKey, true) || [];
    this.globalWeight = app.globalData.applyRecord.weight; // 回退体重
    this.setData({
      horizontal: this.horizontal,
      searchVertical: this.windowHeight,
      vertical: this.vertical,
      listHeight: this.getListHeight(),
      searchList : this.historyList,
      cdnHost: app.globalData.config.cdnHost,
      aliyunOssCdnOriginalHost: app.globalData.config.aliyunOssCdnOriginalHost, // 用于上传
      aliyunOssCdnHost: app.globalData.config.aliyunOssCdnHost, // 用于下载
      renderSearch: false
    });
  },
  getListHeight(){
    let searchInputHeight = Util.rpx_to_px(150,this.windowWidth);
    return (this.windowHeight - searchInputHeight)|0
  },
  js_focus(){
    // 先将搜索列表渲染出来
    this.setData({
      renderSearch: true,
      clearValue:''
    });

    // 然后通过动画将搜索列表显示出来
    setTimeout(() => {
      this.setData({
        searchView:true,
        focusIn:true,
        searchList:this.historyList||[]
      });
    }, 20);
    // 最后令输入框获取焦点
    setTimeout(() => {
      this.setData({focusFlag: true});
    }, 300);
  },
  js_cancel(){
    // 先通过动画将搜索列表隐藏
    this.setData({
      searchView: false,
      keyword:''
    });

    // 然后不渲染搜索列表，并令输入框失去焦点
    setTimeout(() => {
      this.setData({
        renderSearch: false,
        focusFlag: false
      });
    }, 300);
  },
  timer:null,
  js_search( e ){
    let keyword = e.detail.value.trim();
    // 如果输入的关键字为空，则不进行任何操作
    clearTimeout( this.timer );
    if (keyword.length === 0) {
      this.setData({
        keyword,
        searchList:this.historyList
      });
    } else {
      this.setData({keyword})
      this.timer = setTimeout(()=>{
        this.search( keyword );
      },200);
    }
  },
  search( keyword ){
    if( this.data.keyword != keyword) return;
    app.send('queryTrain', {
      keyword: keyword,
      applyId: app.globalData.applyRecord.applyId
    }, 'POST', {
      "content-type": "application/x-www-form-urlencoded",
        'x-rjft-request': 'native',
        'Authorization': `Bearer ${app.globalData.token}`,
        'clientVersion': `${app.globalData.config.clientVersion}`
    }).then(res=>{
      if (res.data && res.data.object && res.data.retcode == 200) {
        let showTag = !res.data.object.list || res.data.object.list.length == 0 ? 1 : +res.data.object.showTag;
        if( this.data.keyword != keyword) return;
        this.setData({
          listHeight: this.getListHeight(),
          weight: +res.data.object.weight || this.globalWeight,
          showTag,
          searchList : res.data.object.list,
          scrollTop: 0 // 每次重新搜索以后，重置scroll-view的滚动高度
        });
      } else {
        app.errorLog({
          url:'queryTrain',
          code:82001,
          serverData: JSON.stringify(res)
        });
        app.toast({
          title: '服务繁忙(82001)',
          icon: 'none'
        });
      }
    }).catch( err=>{
      app.toast({
        title: '服务繁忙(82000)',
        icon: 'none'
      });
      app.errorLog({
        url:'queryTrain',
        code:82000,
        serverData:JSON.stringify(err)
      })
    })
  },
  js_loadMore(){
    console.log('加载更多')
  },
  //点击搜索列表的运动
  js_select( e ){
    let id = e.currentTarget.dataset.index;
    let train;
    this.data.selectedList.forEach(item=>{
      if( item.id == id ){
        train = item;
      }
    })
    train = train || this.getTrain(id)||{};
    this.showUnitsView( train );
  },
  getTrain(id) {
    var item;
    this.data.searchList.forEach(o => {
      if (o.id == id) {
        item = o;
      }
    });
    return item;
  },
  showUnitsView(train){
    let minutes = train.minutes||30;
    let kcal = this.getKcal(minutes||0,train);
    train.change = false;
    this.setData({
      unitsView: true,
      renderLayer: true, // 渲染蒙层
      train,
      minutes,
      kcal
    });

    // 显示蒙层
    setTimeout(() => {
      this.setData({
        showLayer: true
      });
    }, 20);
  },
  js_editView( e ){
    if (this.data.delView) return;
    let id = e.currentTarget.dataset.index;
    let train;
    this.data.selectedList.forEach(item => {
      if (item.id == id) {
        train = item;
      }
    });
    train && this.showUnitsView(train);
  },
  //添加自定义运动
  js_diyTrain(){
    let keyword = this.data.keyword;
    let train;
    this.data.selectedList.forEach(item=>{//如果已经添加则编辑已经添加的
      if (item.isDiy && item.name == keyword){
        train = item;
      }
    });

    this.showUnitsView(train || {
      id: 'diy_' + Date.now()+((Math.random()*10000)|0),
      name: this.data.keyword,
      isDiy: true
    });
  },
  js_delView(){
    if(this.data.selectedList.length === 0) {
      return;
    }

    this.setData({
      delView: !this.data.delView
    })
  },
  //删除运动
  js_delTrain( e ){
    var index = +e.currentTarget.id;
    var selectedList = this.data.selectedList;
    selectedList = selectedList.slice(0, index).concat(selectedList.slice(index + 1, selectedList.length))
    this.setData({
      selectedList,
      delView: selectedList.length > 0 // 当选择的运动数量删减为0时，自动切换为不可编辑状态
    });
  },
  js_changeImg(){
    if (this.js_changeImg.busy) {//
      return
    }
    this.js_changeImg.busy = true;
    app.chooseImage().then((res) => {
      this.setData({
        imgPath: res.tempFilePaths[0]
      });
      this.js_changeImg.busy = false
    }).catch(err => {
      this.js_changeImg.busy = false;
    });
  },
  js_bindChange( e ){
    /*let val = e.detail.value[1];
    let minutes = +val;
    let kcal = this.getKcal(minutes);
    this.setData({
      minutes,
      kcal
    })*/
  },
  getKcal(minutes,trainTmp){
    let train = trainTmp || this.data.train;
    if (train.isDiy) return '';
    let kcal = 0.0167 * (train.mopValue || 0) * minutes * (this.data.weight || this.globalWeight);
    return kcal.toFixed(1);
  },
  js_addTrain(){
    let selectedList = this.data.selectedList||[];
    let { id, name, isDiy, mopValue} = this.data.train;
    let { kcal, minutes } = this.data;
    let train = { id, name, kcal, minutes, isDiy };
    if( minutes.length==0 ) return app.toast({
      icon:'none',
      title:'数量不能为空!'
    });
    if( minutes==0 ) return app.toast({
      icon:'none',
      title:'数量不能为0!'
    });
    selectedList.forEach(item=>{
      if ( train && train.id == item.id ){
        item.kcal = kcal;
        item.minutes = minutes;
        train = null;
      }
    });
    train && selectedList.push({ id, name, kcal, minutes, mopValue, isDiy, change:true});
    this.setData({
      selectedList,
      searchList:[],
      unitsView:false,
      showLayer: false, // 不渲染蒙层
      keyword:'',
      searchView:false
    });

    // 隐藏蒙层
    setTimeout(() => {
      this.setData({
        renderLayer: false, // 隐藏蒙层
        renderSearch: false // 隐藏搜索列表
      });
    }, 300);
  },
  // 判断是否已经填写完毕
  canNext() {
    let hasImage = Boolean(this.data.imgPath); // 是否选择了图片
    let hasTrain = this.data.selectedList.length > 0; // 是否选择了运动项目

    return {
      next: hasImage || hasTrain,
      hasImage,
      hasTrain,
      data: {
        imgPath: this.data.imgPath || '/img/trainingdk2.png',
        selectedList: this.data.selectedList
      }
    };
  },
  next() {
    let selectedList = this.data.selectedList;
    let canNext = this.canNext();
    if (!canNext.next) {
      let msg = '信息不全';
      if (!(canNext.hasImage || canNext.hasTrain)) {
        msg = '请选择训练照片或者训练内容';
      }
      native.toast({
        icon: 'none',
        title: msg
      });

      return;
    }

    // 如果选择了运动照片，则上传照片
    if (!checkInUtils.isDefaultRecordImage(canNext.data.imgPath)) {
      this.uploadOriginImage(imgConfig => {
        console.log(imgConfig);

        // 保存运动信息到全局数据
        canNext.data.width = imgConfig.width;
        canNext.data.height = imgConfig.height;
        canNext.data.imgPath = imgConfig.imgPath;
        app.globalData.trainCheckinData = canNext.data;

        native.location(`/pages/recordNew/train/result/result?type=${this.data.type}`);
      });
      // 如果是默认图片，否则直接跳转到打卡结果页
    } else {
      // 保存餐食信息到全局数据
      canNext.data.width = 750;
      canNext.data.height = 750;
      app.globalData.trainCheckinData = canNext.data;

      native.location(`/pages/recordNew/train/result/result?type=${this.data.type}`);
    }
  },
  // 上传原始图片
  uploadOriginImage (callback) {
    app.loading({
      title: '图片上传中...',
      mask:true
    });

    let page = this;
    if (!checkInUtils.isDefaultRecordImage(this.data.imgPath)) { // 非默认图片，上传七牛
      if (!wx.getImageInfo) {
        app.errorLog({
          url:'getImageInfo',
          code:'recordEditPage',
          serverData:'当前微信版本不支持wx.getImageInfo接口'
        });
      }

      wx.getImageInfo({
        src: page.data.imgPath,
        success(res) {
          let width = res.width;
          let height = res.height;

          console.log(['上传原始图片到阿里', res.path]);
          let uploadConfig = app.globalData.config.uploadConfig;

          page
            .uploadFile(res, width, height, callback)
            .catch(err => {
              if (uploadConfig === 'normal') {
                page.uploadFile(res, width, height, callback, true);
              } else {
                page.uploadFileAli(res, width, height, callback, true);
              }
            });
        },
        fail(err) {
          app.loading();

          app.errorLog({
            url: 'getImageInfo',
            code: 'recordEditPageFail',
            serverData: JSON.stringify(err || '图片读取失败')
          });

          app.alert('抱歉，出现异常，请重新选择图片！');
          // 出现异常的时候将图片地址清空
          page.setData({
            imgPath: ''
          });
        }
      })
    } else {
      app.loading();
      callback && callback({ imgPath: this.data.imgPath, width: 750, height: 750});
    }
  },
  uploadFile(res, width, height, callback, isNotFirst){
    let page = this;
    let uploadUrl = URLMap.uploadImage;

    return new Promise((resolve, reject) => {
      isNotFirst && beforeRetry();

      let uploadFileRetry = Util.retry(
        performUploadFile,
        errHandler,
        {
          retryCount: 0,
          log: true,
          wait: 2000
        });

      uploadFileRetry();

      function beforeRetry() {
        app.loading({
          title: '正在加载中...',
          mask: true
        });

        // 每次重试先记日志
        app.errorLog({
          url: uploadUrl,
          page: PAGE_INFO,
          code: '80003',
          state: 'beforeRetry',
          serverData: JSON.stringify(res || {})
        });
      }

      function performUploadFile(retry, currentCount) {
        wx.uploadFile({
          url: uploadUrl,
          filePath: res.path,
          name: 'file',
          success(res) {
            console.log( res );

            if (typeof res.data == "string") {
              try{
                res.data = JSON.parse(res.data);
              }catch(e){
                res.data = {};
              }
            }
            if( res.data && res.data.key ){
              res.data.imageUrl = app.globalData.config.cdnHost+res.data.key;
            }
            if (res.data && res.data.imageUrl instanceof Array) {
              res.data.imageUrl = res.data.imageUrl[0];
            }

            // 这里表示请求（上传）成功，但是返回的图片地址为空，因此需要重试
            if (!res.data || !res.data.imageUrl) {
              retry(null, res);
              return;
            }

            // 这里重试成功也要记录日志
            if (isNotFirst) {
              app.errorLog({
                url: uploadUrl,
                page: PAGE_INFO,
                code: '80003',
                state: 'RetrySuccess',
                serverData: JSON.stringify(res || {})
              });
            }

            let imgPath = res.data.imageUrl;
            let imgConfig = checkInUtils.addImageCutParam(width, height, imgPath);
            page.setData({
              imgPath: imgConfig.imgPath
            });
            app.loading();
            callback && callback(imgConfig);
          },
          fail(err) {
            retry(err, null);
          }
        });
      }

      // 错误处理方法，发送错误日志，弹框提示用户错误信息
      function errHandler(err, res, currentCount) {
        console.log('err handler');
        isNotFirst && app.loading();

        app.errorLog({
          url: uploadUrl,
          page: PAGE_INFO,
          code: '80003',
          state: 'failed',
          serverData: JSON.stringify(err || res)
        });

        isNotFirst && app.alert((((res && res.data) || {}).retdesc || '图片上传失败') + '(80003)');

        reject();
      }
    });
  },
  uploadFileAli(res, width, height, callback, isNotFirst){
    let page = this;
    let uploadUrl = page.data.aliyunOssCdnOriginalHost;

    return new Promise((resolve, reject) => {
      isNotFirst && beforeRetry();

      let uploadFileRetry = Util.retry(
        performUploadFile,
        errHandler,
        {
          retryCount: 0,
          log: true,
          wait: 2000
        });

      uploadFileRetry();

      function beforeRetry() {
        app.loading({
          title: '正在加载中...',
          mask: true
        });

        // 每次重试先记日志
        app.errorLog({
          url: uploadUrl,
          page: PAGE_INFO,
          code: '83003',
          state: 'beforeRetry',
          serverData: JSON.stringify(res || {})
        });
      }

      function performUploadFile(retry, currentCount) {
        let multipartParam = checkInUtils.getMultipartParams();
        var key = Date.now()+(Math.random()+'').replace('.','');
        multipartParam.key = key;
        console.log( uploadUrl + key );
        wx.uploadFile({
          url: uploadUrl,
          filePath: res.path,
          name: 'file',
          formData: multipartParam,
          success(res) {
            console.log( res );

            // 上传失败，因此需要重试
            if (res.statusCode !== 200) {
              retry(null, res);
              return;
              // 上传成功
            } else {
              res.imgUrl = page.data.aliyunOssCdnHost + key;
              console.log(`res.imgUrl = ${res.imgUrl}`);
            }

            // 这里重试成功也要记录日志
            if (isNotFirst) {
              app.errorLog({
                url: uploadUrl,
                page: PAGE_INFO,
                code: '83003',
                state: 'RetrySuccess',
                serverData: JSON.stringify(res || {})
              });
            }

            let imgPath = res.imgUrl;
            let imgConfig = checkInUtils.addImageCutParamAli(width, height, imgPath);
            page.setData({
              imgPath: imgConfig.imgPath
            });
            app.loading();
            callback && callback(imgConfig);
          },
          fail(err) {
            retry(err, null);
          }
        });
      }

      // 错误处理方法，发送错误日志，弹框提示用户错误信息
      function errHandler(err, res, currentCount) {
        console.log('err handler');
        isNotFirst && app.loading();

        app.errorLog({
          url: uploadUrl,
          page: PAGE_INFO,
          code: '83003',
          state: 'failed',
          serverData: JSON.stringify(err || res)
        });

        isNotFirst && app.alert((((res && res.data) || {}).retdesc || '图片上传失败') + '(83003)');

        reject();
      }
    });
  },
  cancelSelect() {
    let train = this.data.train;
    let fig = this.data.selectedList.some(item=>{
      return item.id == train.id;
    })
    train.change = fig;

    this.setData({
      unitsView: false,
      train,
      showLayer: false // 不显示蒙层
    });

    // 隐藏蒙层
    setTimeout(() => {
      this.setData({
        renderLayer: false // 不渲染蒙层
      });
    }, 300);
  },
  valueChange( e ){
    var minutes = e.detail.value+'';
    var kcal= this.getKcal(parseFloat(minutes)||0);
    let train = this.data.train;
    train.change = true;
    this.setData({
      minutes,
      kcal,
      train
    })


  }
});