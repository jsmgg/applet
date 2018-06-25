// pages/components/keyboard/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    maxValue:{//最大值
      type:'number',
      value:999
    },
    maxLength:{
      type:'number',
      value:5
    },
    dotLength:{//保留小数位
      type:'number',
      value:1,
      observer(newVal, oldVal){
        
      }
    },
    value:{
      type:'string',
      value:'',
      observer(newVal, oldVal){
        //this.triggerEvent('valueChange',{value:newVal})
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
  },

  /**
   * 组件的方法列表
   */
  methods: {
    trigger( value ){
      this.setData({value});
      this.triggerEvent('valueChange',{value})
    },
    js_num( e ){
      console.log(this.data.value);
      var num = e.currentTarget.dataset.num;
      var value = this.data.value+'';
      var maxValue = this.data.maxValue;
      if(value==='0')return;
      if(value.length>=this.data.maxLength) return;
      if(value.indexOf('.')>=0 && (value.split('.')[1]+'').length>=this.data.dotLength){
        return this.trigger(parseFloat(value).toFixed(this.data.dotLength));
      }
      value+=num;
      if(+value>+maxValue) {
        value = maxValue;
      }
      this.trigger(value);
    },
    js_del(){
      var val = this.data.value+'';
      if(val.length == 0 ) return this.trigger('');
      this.trigger(val.substr(0,val.length-1));
    },
    js_dot(){
      var value = this.data.value+'';
      if(value.length == 0 ) return;
      if(this.dotLength==0) return;
      if( value.indexOf('.')>=0 ) return;
      if(value.length>=this.data.maxLength) return;
      if(value==this.data.maxValue) return;
      this.trigger(value+'.');
    }
  }
})
