var app = getApp();
var util = require('../../../../utils/util.js');
var playIndexCache = 'playIndexCache';
module.exports = {
  getIndexCache(type, key) {//type:plan day
    type = type||'day';
    if(!key) return;
    var cache = app.getStorage(playIndexCache,true)||{};
    var cache_key = this.getCacheKey(type, key);
    var currentIndex = cache[cache_key]||[];
    if (currentIndex && currentIndex.length==2){
      return [currentIndex[0], currentIndex[1]];
    }
  },
  getCacheKey(type,key) {
    var cache_key;
    if (type == 'day') {
      cache_key = 'day' + key;
    } else {
      cache_key = util.formatTime(Date.now(), 'yyyy-MM-dd') + key;
    }
    return cache_key;
  },
  setIndexCache(type,key,currentIndex){
    type = type || 'day';
    if (!key || !currentIndex || currentIndex.length!=2) return;
    var cache = app.getStorage(playIndexCache, true) || {};
    var cache_key = this.getCacheKey(type, key);
    cache[cache_key] = [currentIndex[0], currentIndex[1]];
    app.setStorage({
      key: playIndexCache,
      data: cache
    },true)
  },
  removeCache(type, key) {
    type = type || 'day';
    if (!key) return;
    var cache = app.getStorage(playIndexCache, true) || {};
    var cache_key = this.getCacheKey(type, key);
    cache[cache_key+'-end'] = cache[cache_key] = null;
    delete cache[cache_key];
    delete cache[cache_key + '-end']
    app.setStorage({
      key: playIndexCache,
      data: cache
    }, true)
  },
  setEnd(type, key){
    type = type || 'day';
    if (!key) return;
    var cache = app.getStorage(playIndexCache, true) || {};
    var cache_key = this.getCacheKey(type, key);
    cache[cache_key+'-end'] = 1;
    app.setStorage({
      key: playIndexCache,
      data: cache
    }, true)
  },
  isEnd(type, key){
    type = type || 'day';
    if (!key) return;
    var cache = app.getStorage(playIndexCache, true) || {};
    var cache_key = this.getCacheKey(type, key);
    if (cache[cache_key + '-end']==1){
      return 1;
    }
  },
  setLevel(type, key, level) {
    type = type || 'level';
    if (!key) return;
    var cache = app.getStorage(playIndexCache, true) || {};
    var cache_key = this.getCacheKey(type, key);
    cache[cache_key + '-level'] = level;
    app.setStorage({
      key: playIndexCache,
      data: cache
    }, true);
  },
  getLevel(type, key) {
    type = type || 'level';
    if (!key) return;
    var cache = app.getStorage(playIndexCache, true) || {};
    var cache_key = this.getCacheKey(type, key);
    return cache[cache_key + '-level'];
  }
}