/**********工具**********/
const app = getApp();
const utils = require('../../../../utils/util');
const checkInUtils = require('../../../../utils/checkinUtil');
const native = require('../../../../api/native');
const URLMap = require('../../../../config.js');
const Promise = require('../../../../utils/lib/es6-promise.min');

/**********常量**********/
const GRAM_NAME = '克';

const RECIPE_HISTORY = app.appletRecipeRecordLable;
const PAGE_INFO = '/recordNew/food/edit/edit.js';

Page({
  data: {
    isEditing: false,
    isSearching: false,
    showTag: 0, // 是否显示自定义食材编辑入口
    keyword: '', // 搜索的关键字
    recipe: {}, // 当前正在编辑的食材实例
    searchResult: [], // 搜索列表/历史搜索列表 
    contentList: [], // 选择的食材列表
    customRecipeList: [], // 自定义食材列表
    renderLayer: false, // 控制蒙层渲染  默认false
    showLayer: false, // 控制蒙曾层显示  默认false
    showEditor: false, // 控制编辑框显示  默认false
    renderSearch: false, // 控制搜索列表的显隐
    home: "selected",
    from: "home",
    clearValue:'' //
  },
  onLoad: function (options) {
    // 从缓存中获取用户之前上传过的食材信息
    let recipeHistory = native.getStorage(RECIPE_HISTORY, true) || [];

    // 获取屏幕信息
    app.getSystemInfo().then(res => {
      let windowHeight = res.windowHeight;
      let windowWidth = res.windowWidth;
      this.windowHeight = windowHeight;
      this.windowWidth = windowWidth;
      this.vertical = utils.rpx_to_px(750, windowWidth); // 编辑框的高度
      this.headerHeight = utils.rpx_to_px(310, windowWidth);
      this.sourceHeight = utils.rpx_to_px(142, windowWidth);
      this.contentHeaderHeight = utils.rpx_to_px(122, windowWidth);
      this.contentItemHeight = utils.rpx_to_px(110, windowWidth);
      
      // 这里将搜索历史保存起来，后面方便在搜索记录和历史记录之前切换
      this.data.recipeHistory = recipeHistory;
      this.setData({
        cdnHost: app.globalData.config.cdnHost,
        aliyunOssCdnOriginalHost: app.globalData.config.aliyunOssCdnOriginalHost, // 用于上传
        aliyunOssCdnHost: app.globalData.config.aliyunOssCdnHost, // 用于下载
        searchVertical: this.windowHeight,
        vertical: this.vertical,
        searchResult: recipeHistory
      });
    });

    // 设置页面标题
    let type = options.type;
    let typeMap = {
      breakfast: "早餐打卡",
      lunch: "午餐打卡",
      dinner: "晚餐打卡"
    };
    let title = typeMap[type];
    wx.setNavigationBarTitle({title});
    this.data.type = type;
  },
  initScroll() {
    let windowWidth = this.windowWidth;
    let windowHeight = this.windowHeight;
    let topHeight = utils.rpx_to_px(190, windowWidth);
    return windowHeight - topHeight;
  },
  changeRecordImage: function () {
    if(this.changeRecordImage.busy){
      return;
    }
    this.changeRecordImage.busy = true;
    app.chooseImage().then((res) => {
      this.setData({
        imgPath: res.tempFilePaths[0],
        imgPathShow: res.tempFilePaths[0]
      });
      this.changeRecordImage.busy = false
    }).catch(err => {
      this.changeRecordImage.busy = false;
    });
  },
  switchFrom(e) {
    let data = e.currentTarget.dataset;
    let from = data.from;
    let classes = {};
    switch(from) {
      case 'home':
        classes.home = 'selected';
        classes.out = '';
        this.data.from = 'home';
        break;
      case 'out':
        classes.home = '';
        classes.out = 'selected';
        this.data.from = 'out';
        break;
    }
    this.setData(classes);
  },
  switchEditState() {
    if (this.data.contentList.length === 0) {
      return;
    }

    this.data.isEditing = !this.data.isEditing;
    this.setData({isEditing : this.data.isEditing});
  },
  delItem(e) {
    let recipeIndex = e.currentTarget.dataset.index;
    let contentList = this.data.contentList;
    let currentRecipe = contentList[recipeIndex];
    let customRecipeList = this.data.customRecipeList;

    // 先从总列表中删除
    contentList.splice(recipeIndex, 1);
    // 如果是自定义食材，则也要从自定义食材列表中删除
    if (currentRecipe.custom) {
      customRecipeList.forEach((recipe, index) => {
        if (recipe.id === currentRecipe.id) recipeIndex = index;
      });
      customRecipeList.splice(recipeIndex, 1);
    }

    let data = {contentList};
    // 这里判断如果列表空了，则改变为不可编辑状态
    if (contentList.length === 0) {
      data.isEditing = false;
    }

    this.setData(data);
  },
  focus(e) {
    // 计算scroll-view的高度
    let scrollHeight = this.initScroll();

    // 先将搜索列表渲染出来
    this.setData({
      renderSearch: true,
      clearValue:'',
      scrollHeight
    });

    // 再将搜索列表通过动画显示出来
    setTimeout(() => {
      this.setData({
        isSearching: true
      });
    }, 20);

    // 最后令输入框获取焦点
    setTimeout(() => {
      this.setData({
        focusFlag: true
      });
    }, 300);
  },
  cancelSearch() {
    // 先通过动画隐藏搜索列表
    this.setData({
      isSearching: false,
      focusFlag: false,
      showTag: 0,
      keyword: '',
    });

    // 然后不再渲染搜索列表，这里再将搜索列表切换为历史列表
    setTimeout(() => {
      this.setData({
        renderSearch: false,
        searchResult: this.data.recipeHistory // 这里切换为历史记录
      });
    }, 300);
  },
  timer : null,
  confirm(e) {
    let keyword = e.detail.value.trim();
    // 如果输入的关键字为空，则不进行任何操作
    /*if (keyword.length === 0) {
      native.toast({
        title: '请输入食材名称',
        icon: 'none'
      });
      return;
    }

    let timer = setTimeout(()=>{
      app.loading('加载中...');
    }, 300);*/
    clearTimeout(this.timer);
    if( keyword.length == 0 ) {
      this.setData({
        keyword,
        showTag:false,
        searchResult: this.data.recipeHistory
      })
    } else {
      this.setData({keyword})
      this.timer = setTimeout(()=>{
        this.search( keyword )
      },200)
    }


  },
  search( keyword ){
    if(keyword!=this.data.keyword) return;
    app.send('queryRecipe', { keyword: keyword}, 'POST', {
      "content-type": "application/x-www-form-urlencoded",
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`,
      'clientVersion': `${app.globalData.config.clientVersion}`
    }).then(res => {
      //clearTimeout(timer);
      //app.loading();
      if (res.data && res.data.object  && res.data.retcode === 200 ) {
        // 是否显示自定义
        if(keyword!=this.data.keyword) return;
        let showTag = !res.data.object.list || res.data.object.list.length === 0 ? 1 : res.data.object.showTag;
        this.setData({
          showTag,
          searchResult : this.format(res.data.object.list),
          keyword,
          scrollTop: 0 // 这里每次搜索以后，都要重置scroll-view的滚动高度
        });
      } else {
        app.errorLog({
          url: 'queryRecipe',
          code: 83000,
          serverData: JSON.stringify(res)
        });
        app.toast({
          icon: 'none',
          title: '服务繁忙(83000)'
        });
      }
    }).catch( err=>{
      //clearTimeout(timer);
      //app.loading();
      //app.alert('服务繁忙(83000)');
      app.toast({
        icon: 'none',
        title: '服务繁忙(83000)'
      });
      app.errorLog({
        url: 'queryRecipe',
        code: 83000,
        serverData: JSON.stringify(err)
      })
    })
  },
  js_loadMore(){
    console.log('加载更多')
  },
  // 格式化搜索出来的食材列表
  format(list) {
    return list.map(recipe => {
      recipe.gramUnit = `${recipe.calorie}千卡/100克`;
      return recipe;
    });
  },
  // 从食材内容列表选择
  editItem(e) {
    // 如果当前处于
    if (this.data.isEditing) return;
    this.select(e);
  },
  // 从搜索列表选择
  searchItem(e) {
    this.select(e);
  },
  // 弹框开始选择食材单位和重量
  select(e) {
    let contentList = this.data.contentList;
    let currentRecipe = e.currentTarget.dataset.recipe;
    if (!(currentRecipe.unit && currentRecipe.count)) { // 原始数据
      // 根据id判断是否添加过相同的食材
      let isContain = false;
      for(let i = 0, len = contentList.length; i < len; i++) {
        isContain = contentList[i].id === currentRecipe.id;
        if (isContain) break;
      }

      // 如果包含
      if (isContain) {
        // 则先从食材列表中将之前的食材查找出来
        contentList.forEach(recipe => {
          if (recipe.id === currentRecipe.id) currentRecipe = recipe;
        });

        // 然后获取单位和数量序号
        let unitIndex = 0;
        // 先查找单位序号
        let units = currentRecipe.units;
        units.forEach((unit, index) => {
          if (currentRecipe.unit.unit === unit.unit) unitIndex = index;
        });
        // 再查找质量序号
        //countIndex = currentRecipe.masses.indexOf(currentRecipe.count);

        currentRecipe.value = [unitIndex];

        this.showPicker(currentRecipe, unitIndex);
      } else {
        currentRecipe.value = [0]; // 在这里初始化选择的id
        let unitIndex = 0;
        let firstUnit = currentRecipe.units[unitIndex];
        this.initUnit(currentRecipe, firstUnit, unitIndex);
      }
    } else { // 用户编辑过的数据
      let unitIndex = 0;
      let units = currentRecipe.units;
      // 获取用户选择的单位序号
      units.forEach((unit, index) => {
        if (unit.unit === currentRecipe.unit.unit) unitIndex = index;
      });
      // 获取用户选择的数量的序号
      //countIndex = currentRecipe.masses.indexOf(currentRecipe.count);

      currentRecipe.value = [unitIndex];

      this.showPicker(currentRecipe, unitIndex);
    }
  },
  customRecipe() {
    let name = this.data.keyword;
    let recipe;// = this.data.recipe;

    // 根据名称判断是否添加过相同的自定义食材
    let customRecipeList = this.data.customRecipeList;
    customRecipeList.forEach( item => {
      if (item.name === name){
        recipe = item;
      }
    });

    // 如果包含，则需要知道之前选择的质量的序号
    if (recipe) {
      recipe.value = [0];
    } else { // 如果不包含，则构造一个新的食材实例
      recipe = {
        id: 'c' + Date.now()+((Math.random() * 10000) | 0),
        name,
        calorie: -1,
        units: [{unit: '克', weight: 100, calorie: -1, defaultCount:100}],
        custom: true // 表示这是一个自定义食材
      };
    }

    this.initUnit(recipe, recipe.units[0], 0);
  },
  initUnit(recipe, unit, unitIndex) {
    if (unit.unit === GRAM_NAME) {
      //recipe.masses = GRAM_MASSES;
      recipe.isGram = true;
      recipe.calCalorie = unit.calorie / 100;
      recipe.weight = unit.weight / 100;
    } else {
      //recipe.masses = OTHER_MASSES;
      recipe.isGram = false;
      recipe.calCalorie = unit.calorie / 2;
      recipe.weight = unit.weight / 2;
    }
    recipe.count = unit.prevCount||unit.defaultCount;
    recipe.unit = unit;

    // 计算当前值
    recipe.current = {
      calorie: recipe.calCalorie >= 0 ? (recipe.calCalorie * (recipe.count||0)).toFixed(1) : -1,
      weight: (recipe.weight * (recipe.count||0)).toFixed(1)
    };

    this.showPicker(recipe, unitIndex);
  },
  showPicker(recipe, unitIndex) {
    (recipe.unit || {}).change = false;
    this.setData({
      renderLayer: true, // 渲染蒙层
      unitIndex, // 这里记录弹框时选择的单位序号
      recipe
    });

    setTimeout(() => {
      this.setData({
        showLayer: true, // 显示蒙层
        showEditor: true // 显示选择框
      });
    }, 20);
  },
  // 选择完毕
  selected() {
    let contentList = this.data.contentList;
    let customRecipeList = this.data.customRecipeList; // 自定义食材列表
    let currentRecipe = this.data.recipe; // 当前用户选中的食材

    let checkMsg = this.checkData(currentRecipe);

    if( checkMsg ){
      return app.toast({
        icon: 'none',
        title: checkMsg
      });
    }
    // 重量
    if (currentRecipe.isGram) { // 单位是克
      currentRecipe.mass = currentRecipe.current.weight + '克';
    } else { // 其他单位
      currentRecipe.mass = currentRecipe.count + currentRecipe.unit.unit;
    }
    // 卡路里
    let calorie = currentRecipe.current.calorie;
    // 用于展示的卡路里
    currentRecipe.calorieText = calorie >= 0 ? calorie + '千卡' : '未知';

    // 这里需要判断是否添加过这个食材
    let isContain = false, recipeIndex = -1, customRecipeIndex = -1;
    // 如果是自定义食材，则从自定义列表中查找
    if (currentRecipe.custom) {
      // 先从自定义列表中查找
      customRecipeList.forEach((recipe, index) => {
        if (recipe.id === currentRecipe.id) {
          isContain = true;
          customRecipeIndex = index;
        }
      });

      // 再从总列表中查找
      contentList.forEach((recipe, index) => {
        if (recipe.id === currentRecipe.id) {
          recipeIndex = index;
        }
      });
    // 否则在总列表中查找
    } else {
      contentList.forEach((recipe, index) => {
        if (recipe.id === currentRecipe.id) {
          isContain = true;
          recipeIndex = index;
        }
      });
    }

    if (isContain) { // 如果包含则替换
      contentList.splice(recipeIndex, 1, currentRecipe);
      if (currentRecipe.custom) { // 如果是自定义食材
        customRecipeList.splice(customRecipeIndex, 1, currentRecipe);
      }
    } else { // 否则就添加到列表
      contentList.push(currentRecipe);
      if (currentRecipe.custom) { // 如果是自定义食材
        customRecipeList.push(currentRecipe);
      }
    }

    currentRecipe.unit.change = true;//设置为已经编辑过
    currentRecipe.unit.prevCount = currentRecipe.count;
    currentRecipe.units[this.data.unitIndex].change = true;//设置为已经编辑过
    currentRecipe.units[this.data.unitIndex].prevCount = currentRecipe.count;

    this.setData({
      contentList,
      showEditor: false,
      showLayer: false, // 隐藏蒙层
      isSearching: false,
      keyword: '',
      showTag: 0, // 默认不显示自定义添加入口
      searchResult: this.data.recipeHistory // 这里切换为历史记录
    });

    // 隐藏蒙层
    setTimeout(() => {
      this.setData({
        renderLayer: false, // 不渲染蒙层
        renderSearch: false // 不渲染搜索列表
      });
    }, 300);
  },
  checkData( recipe ){
    var unit_1 = ['克','毫升'];
    var val = recipe.count||'';
    var unitStr = recipe.unit.unit;
    console.log(recipe.count);
    if( val.length ==0){
      return unitStr+'数不能为空!';
    }
    if( parseFloat(recipe.count) == 0 ) {
      return unitStr+'数不能为0！'
    }
  },
  picking(e) {
    let value = e.detail.value;
    let recipe = this.data.recipe;

    // 判断单位是否发生变化
    if (this.data.unitIndex !== value[0]) {
      recipe.value = value;
      recipe.units[this.data.unitIndex].prevCount = recipe.count;//这里记住上一次填写的数字
      this.initUnit(recipe, recipe.units[value[0]], value[0]);
      return;
    }
    recipe.value = value;
    recipe.current = {
      calorie: recipe.custom ? -1 : (recipe.calCalorie * recipe.count).toFixed(1),
      weight: (recipe.weight * recipe.count).toFixed(1)
    };
    console.log(`current calorie = ${recipe.current.calorie}`);
    this.setData({recipe});
  },
  cancelSelect(e) {
    this.setData({
      showEditor: false,
      showLayer: false // 隐藏蒙层
    });

    // 隐藏蒙层
    setTimeout(() => {
      this.setData({
        renderLayer: false // 不渲染蒙层
      });
    }, 300);
  },
  // 判断是否已经填写完毕
  canNext() {
    let hasImage = Boolean(this.data.imgPath); // 是否选择了图片
    let hasSource = Boolean(this.data.from); // 是否选择了食材来源
    let hasRecipe = this.data.contentList.length > 0; // 是否选择了食材

    return {
      next: (hasImage || hasRecipe) && hasSource,
      hasImage,
      hasSource,
      hasRecipe,
      data: {
        imgPath: this.data.imgPath || '/img/dietdkDefault.png',
        from: this.data.from,
        recipeList: this.data.contentList
      }
    };
  },
  next() {
    // 先判断是否填写完整
    let canNext = this.canNext();
    if (!canNext.next) {
      let msg = '信息不全';
      if (!(canNext.hasImage || canNext.hasRecipe)) {
        msg = '请选择餐食照片或者餐食内容';
      } else if(!canNext.hasSource) {
        msg = '请选择餐食来源';
      }
      native.toast({
        icon: 'none',
        title: msg
      });

      return;
    }

    // 如果选择了餐食照片，则上传餐食照片
    if (!checkInUtils.isDefaultRecordImage(canNext.data.imgPath)) {
      this.uploadOriginImage(imgConfig => {
        console.log(imgConfig);

        // 保存餐食信息到全局数据
        canNext.data.width = imgConfig.width;
        canNext.data.height = imgConfig.height;
        canNext.data.imgPath = imgConfig.imgPath;
        app.globalData.foodCheckinData = canNext.data;
        console.log(canNext.data);

        native.location(`/pages/recordNew/food/result/result?type=${this.data.type}`);
      });
    // 如果是默认图片，否则直接跳转到打卡结果页
    } else {
      // 保存餐食信息到全局数据
      canNext.data.width = 750;
      canNext.data.height = 750;
      app.globalData.foodCheckinData = canNext.data;

      native.location(`/pages/recordNew/food/result/result?type=${this.data.type}`);
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
            .catch(() => {
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

      let uploadFileRetry = utils.retry(
        performUploadFile,
        errHandler,
        {
          retryCount: 0, // 目前不再原位重试
          log: true,
          wait: 2000
        });

      uploadFileRetry();

      function beforeRetry() {
        app.loading({
          title: '正在加载中...',
          mask: true
        });

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
              res.data.imageUrl = page.data.cdnHost+res.data.key;
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

      let uploadFileRetry = utils.retry(
        performUploadFile,
        errHandler,
        {
          retryCount: 0, // 目前不再原位重试
          log: true,
          wait: 2000
        });

      uploadFileRetry();

      function beforeRetry() {
        app.loading({
          title: '正在加载中...',
          mask: true
        });

        app.errorLog({
          url: uploadUrl,
          page: PAGE_INFO,
          code: '83003',
          state: 'beforeRetry',
          serverData: JSON.stringify(res || {})
        });
      }

      function performUploadFile(retry, currentCount) {
        let multipartParams = checkInUtils.getMultipartParams();
        let key = Date.now()+(Math.random()+'').replace('.','');
        multipartParams.key = key;
        console.log( uploadUrl + key );
        wx.uploadFile({
          url: uploadUrl,
          filePath: res.path,
          name: 'file',
          formData: multipartParams,
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
  reference() {
    let type = this.data.type;
    app.location(`/pages/recordNew/food/reference/reference?type=${type}`);
  },
  valueChange( e ){
    var recipe = this.data.recipe;
    recipe.count = e.detail.value+'';
    recipe.units[this.data.unitIndex].change = true;
    recipe.unit.change = true;
    recipe.current = {
      calorie: recipe.custom ? -1 : (recipe.calCalorie * (recipe.count||0)).toFixed(1),
      weight: (recipe.weight * (recipe.count||0)).toFixed(1)
    };


    this.setData({recipe});
  }
});