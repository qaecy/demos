import{a as j}from"./chunk-2QGZ5CPI.js";import{b as S,d as M}from"./chunk-GVELKS7D.js";import{Fb as v,Pa as E,_a as F,ub as L}from"./chunk-NJMMR2MB.js";import{U as I,X as P,_ as k}from"./chunk-7WATJAWA.js";import{$a as w,Cc as C,Ec as b,Gb as a,Hb as s,Lb as g,Nb as p,Ob as _,Wb as c,bc as h,da as l,g as n,ja as m,na as d,ub as x,wa as f,wb as y,xa as u}from"./chunk-CL3WTTFP.js";var T=(()=>{let t=class t{constructor(){this._components=new L}processFile(r){return n(this,null,function*(){let e=yield r.arrayBuffer(),i=new v(this._components);j(i),i.settings.excludedCategories=new Set,i.settings.optionalCategories=[E,F],i.settings.wasm={path:"https://unpkg.com/web-ifc@0.0.54/",absolute:!0},this._group=yield i.load(new Uint8Array(e))})}downloadProperties(){return n(this,null,function*(){let r=this._group?.getLocalProperties();S(r,"props.json")})}};t.\u0275fac=function(e){return new(e||t)},t.\u0275prov=l({token:t,factory:t.\u0275fac,providedIn:"root"});let o=t;return o})();function D(o,t){if(o&1){let A=g();a(0,"button",2),p("click",function(){f(A);let e=_();return u(e.downloadProperties())}),c(1,"Download JSON"),s()}}var $=(()=>{let t=class t{constructor(){this._exporter=m(T),this.processed=!1}loadIFC(){return n(this,null,function*(){this.processed=!1;let r=yield M(".ifc");yield this._exporter.processFile(r),this.processed=!0})}downloadProperties(){return n(this,null,function*(){yield this._exporter.downloadProperties()})}};t.\u0275fac=function(e){return new(e||t)},t.\u0275cmp=d({type:t,selectors:[["app-property-exporter"]],standalone:!0,features:[h],decls:5,vars:1,consts:[["title","Property export"],[2,"display","flex","flex-direction","column","gap","5px"],["mat-stroked-button","",3,"click"],["mat-stroked-button","",3,"click",4,"ngIf"]],template:function(e,i){e&1&&(a(0,"lib-page-section",0)(1,"div",1)(2,"button",2),p("click",function(){return i.loadIFC()}),c(3,"Load file"),s(),x(4,D,2,0,"button",3),s()()),e&2&&(w(4),y("ngIf",i.processed))},dependencies:[b,C,k,P,I]});let o=t;return o})();export{$ as a};