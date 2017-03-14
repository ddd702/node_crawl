var cheerio = require('cheerio');
var http = require('http');
var fs = require('fs');
var path = require('path');
var later = require('later');
var config = {
    onceShopItm: 20 //每次获取多少个店铺
};
var utils = {
    dateFormat: function(timestamp, format) {
        var date = new Date(parseInt(timestamp, 10)),
            o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S": date.getMilliseconds()
            };

        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }

        for (var k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
            }
        }
        return format;
    },
    clone: function(obj) { //返回一个克隆的对象  
        var newObj = {};
        for (var prop in obj) {
            newObj[prop] = obj[prop];
        }
        return newObj;
    },
    extend: function(obj1, obj2) { //浅度合并obj1，obj2并返回新对象
        var obj = {};
        var o1 = obj1;
        var o2 = this.clone(obj2);
        for (var prop in o1) {
            if (o2.hasOwnProperty(prop)) {
                obj[prop] = o2[prop];
                delete o2[prop];
            } else {
                obj[prop] = o1[prop];
            }
        }
        for (var prop in o2) {
            obj[prop] = o2[prop];
        }
        return obj;
    }
};
var main = {
    rootPath: __dirname,
    getShopPage: function(urlPath='/shops.htm', pageIndex=1) {
        var _this = this;
        var html = '';
        var options = {
            hostname: 'gz.17zwd.com',
            port: 80,
            path: urlPath,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B137 Safari/601.1'
            }
        };
        http.get(options, function(res) {
            res.on('data', function(rs) {
                html += rs;
            });
            res.on('end', function() {
                var $ = cheerio.load(html);
                var storeNum = $('.goods-daohang-content-item').length;
                var storeName = [];
                _this.writeFile(path.join(__dirname, 'test.html'), $.html());
                $('.goods-daohang-content-item').each(function(index, el) {
                    var $shopSubInfo=$(this).find('.duang-alert-item-right');
                    var storeInfo = {
                        shopMarket: $shopSubInfo.eq(0).text().split(' ')[0],
                        address: $shopSubInfo.eq(0).text(),
                        shopName: $(this).find('.dangkou-shop-name').text(),
                        shopHref: $(this).find('.duang-alert-title a').attr('href'),
                        shopMain: $shopSubInfo.eq(4).text(),
                        shopTel: $shopSubInfo.eq(1).text(),
                        shopQQ: $shopSubInfo.eq(2).find('a').text()
                    };
                    storeName.push(JSON.stringify(storeInfo));
                });
                console.log('当前页码：' + _this.pageNum);
                console.log('当前页店铺数：' + storeNum);
                if (storeNum !== 0) {
                    _this.pageNum++;
                    if (!_this.pathIsExit('oldStoreData/')) {
                        fs.mkdir(path.join(__dirname, 'oldStoreData'));
                    }
                    fs.writeFile(path.join(__dirname, 'oldStoreData/storeName' + pageIndex + '.js'), storeName.join(',\n'), function(err) {
                        if (err) {
                            console.info(err);
                        } else {
                            console.info('ok');
                        }
                    });
                    setTimeout(function() { _this.getShopPage('/shops.htm?page=' + _this.pageNum, _this.pageNum) }, 1500);
                } else {
                    return false;
                }

            });
        });
    },
    httpCb: function(httpOpt, cb) {
        var _this = this;
        var html = '';
        var options = utils.extend({
            hostname: 'gz.17zwd.com',
            port: 80,
            path: '/',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B137 Safari/601.1'
            }
        }, httpOpt);
        http.get(options, function(res) {
            res.on('data', function(rs) {
                html += rs;
            });
            res.on('end', function() {
                console.warn(utils.dateFormat(new Date().getTime(), 'MM-dd  hh:mm:ss') + '       :has get http~~~~' + options.hostname + options.path);
                var $ = cheerio.load(html);
                cb($);
            });
        });
    },
    pathIsExit: function(pathName, all) { //判断文件路径是否存在，all表示绝对路径
        if (all) {
            return fs.existsSync(path.join(pathName));
        }
        return fs.existsSync(path.join(__dirname, pathName));
    },
    writeFile: function(filePath, data, cb) {
        fs.writeFile(filePath, data, function(err) {
            if (cb) {
                cb(err);
            } else {
                console.log(err ? err : filePath + ' is ok');
            }

        });
    },
    readFile: function(filename) {
        console.log('正在读取' + filename);
        try {
            return fs.readFileSync(filename, 'utf-8');
        } catch (err) {
            console.log(err);
        }
    },
    test: function(httpOpt, cb) { //测试
        this.httpCb({ hostname: '70read.com', port: 80 }, function($) {
            console.log($.html());
        });
    },
    getGoodsDetail: function(filePath,index) { //filePath指店铺的文件夹如:store57_47
        var _this = this;
        var storeFolder = [];
        console.log(filePath);
        if (_this.pathIsExit(filePath, true)) {
            fs.readdirSync(filePath).forEach(function(itm2) {
                var itmFloderPath = filePath;
                var itmPath = path.join(filePath, itm2);
                if (new RegExp('storeDetail').test(itm2)) {
                    var goodsLink = '{' + _this.readFile(itmPath) + '}';
                    JSON.parse(goodsLink).goods.forEach(function(itm3) {
                        _this.getGoodsHttp(itm3.link, itmFloderPath, itm3.id);
                    });
                }
                fs.writeFileSync(path.join(__dirname, 'goodsCrawl.log'),index+1);
            });
        }else{
            console.log('无效路径！');
        }

    },
    getGoodsHttp: function(link, parentPath, goodsId) {
        var _this = this;
        console.log(link + '\n' + parentPath);
        setTimeout(function() {
            _this.httpCb({ path: link }, function($temp) {
                var $ = $temp;
                var sizes = [];
                var colors = [];
                var pics = [];
                var thumbnails = [];
                var htmlStr = $.html();
                var skus = htmlStr.match(/<script>ZWD_CFG.SKUS=(\S*);ZWD_CFG.ColorCids/) ? htmlStr.match(/<script>ZWD_CFG.SKUS=(\S*);ZWD_CFG.ColorCids/)[1] : '获取失败';
                var descript = htmlStr.match(/<script>var gAttribute=(\S*);<\/script>/) ? htmlStr.match(/<script>var gAttribute=(\S*);<\/script>/)[1] : '{}';

                $('#J_SIZE .chose-type').each(function(index, el) {
                    sizes.push($(this).text());
                });
                $('#J_COLOR .chose-type').each(function(index, el) {
                    colors.push($(this).text());
                });
                $('.goods-page-small-container img').each(function(index, el) {
                    pics.push($(this).attr('src').replace('50x50', '400x400'));
                    thumbnails.push($(this).attr('src'));
                });
                var data = {
                    id: goodsId,
                    name: $('.goods-page-show-title').text(),
                    price: $('.goods-price .dollar').text(),
                    taobaoPrice: $('.goods-taobao-price del').text(),
                    sizes: sizes.join(','),
                    colors: colors.join(','),
                    skus: skus,
                    pics: pics.join(','),
                    storeId: $('.follow-with').attr('data-sid'),
                    thumbnails: thumbnails.join(','),
                    descript: descript,
                    moreDetail: $('.details-right-allTB-image-container').html()
                };
                if (!_this.pathIsExit(path.join(parentPath, 'goods')), true) {
                    fs.mkdir(path.join(parentPath, 'goods'), function() {
                        //_this.writeFile(path.join(parentPath, 'goods/goodsDetail' + goodsId + '.js'), JSON.stringify(data));
                        _this.appendFile(path.join(parentPath, 'goods/goodsDetail.js'), JSON.stringify(data) + ',\n');
                    });
                } else {
                    _this.appendFile(path.join(parentPath, 'goods/goodsDetail.js'), JSON.stringify(data) + ',\n');
                    //_this.writeFile(path.join(parentPath, 'goods/goodsDetail' + goodsId + '.js'), JSON.stringify(data));
                }

            })
        }, 3000 + Math.random() * 2000);
    },
    testGoods: function() {
        var str = this.readFile(path.join(__dirname, 'oldStoreData/store15946/goods/goodsDetail3419743.html'));
        var html = str.match(/<script>ZWD_CFG.SKUS=(\S*);ZW1D_CFG.ColorCids/) ? str.match(/<script>ZWD_CFG.SKUS=(\S*);ZWD_CFG.ColorCids/)[1] : '获取失败';
        //console.log(str.match(/<script>var 1gAttribute=(\S*);<\/script>/)[1]);
    },
    getShopDetail: function(shopOpt, page, index, endIndex) { //获取店铺详细
        var _this = this;
        setTimeout(function() {
            console.log(utils.dateFormat(new Date().getTime(), 'MM-dd  hh:mm:ss') + ':start get shop ' + shopOpt.id + ' detail!');
            _this.httpCb({ port: 80, path: shopOpt.link + '?page=' + page }, function($) {
                if (!_this.pathIsExit('oldStoreData/' + 'store' + shopOpt.id + '_' + index)) {
                    fs.mkdirSync(path.join(__dirname, 'oldStoreData/' + 'store' + shopOpt.id + '_' + index));
                }
                var goodsArr = [];
                var data = '';
                if (!$('.florid-shop-goods-item').length) { //没有商品
                    return false;
                }
                data += '"avatar":"' + $('.figure-image img').attr('src') + '",';
                data += '\n"name":"' + shopOpt.name + '",';
                data += '\n"id":"' + shopOpt.id + '",';
                data += '\n"region":"' + $('.figure-article-item').eq(1).find('.figure-article-item-right').text() + '",';
                data += '\n"market":"' + shopOpt.market + '",';
                data += '\n"address":"' + $('.figure-article-server-item').eq(1).find('.article-server-item-right').text() + '",';
                data += '\n"tel":"' + shopOpt.tel + '",';
                data += '\n"qq":"' + shopOpt.qq + '",';
                data += '\n"shopMain":"' + shopOpt.major + '",';
                data += '\n"addressNo":"' + shopOpt.address + '",';
                $('.florid-shop-goods-item').each(function(index, el) {
                    var goods = {
                        name: $(this).find('.florid-shop-link a').text(),
                        link: $(this).find('.florid-shop-img-container a').attr('href'),
                        logo: $(this).find('.florid-shop-img-container img').attr('src'),
                        price: $(this).find('.florid-shop-price').text(),
                        id: $(this).find('.florid-shop-g').attr('data-gid')
                    };
                    if (index === ($('.florid-shop-goods-item').length - 1)) {
                        goodsArr.push(JSON.stringify(goods));
                    } else {
                        goodsArr.push(JSON.stringify(goods) + ',');
                    }

                });
                data += '\n"goods":[' + goodsArr.join('\n') + ']';
                _this.writeFile(path.join(__dirname, 'oldStoreData/' + 'store' + shopOpt.id + '_' + index + '/storeDetail' + page + '.js'), data);
                if (endIndex === index) {
                    _this.writeFile(path.join(__dirname, 'shopCrawl.log'), (endIndex + 1) + ',' + config.onceShopItm);
                }
                setTimeout(function() { _this.getShopDetail(shopOpt, ++page, index, endIndex) }, 3000 + Math.random() * 7000); //next page
            })
        }, 3000 + Math.random() * 2000);
    },
    shopsLinkData: function() {
        var _this = this;
        var filePath = path.join(__dirname, 'oldStoreData/storeLinks.js');
        if (!_this.pathIsExit(filePath, true)) {
            return [];
        }
        return JSON.parse('[' + _this.readFile(filePath) + ']');
    },
    getShopCrawlLog: function() {
        var _this = this;
        if (!_this.pathIsExit(path.join(__dirname, 'shopCrawl.log'), true)) {
            fs.writeFileSync(path.join(__dirname, 'shopCrawl.log'), '0,' + config.onceShopItm);
        }
        return _this.readFile(path.join(__dirname, 'shopCrawl.log')).split(',');
    },
    getGoodsCrawlLog: function() {
        var _this = this;
        if (!_this.pathIsExit(path.join(__dirname, 'goodsCrawl.log'), true)) {
            fs.writeFileSync(path.join(__dirname, 'goodsCrawl.log'),0);
        }
        return _this.readFile(path.join(__dirname, 'goodsCrawl.log'));
    },
    writeShopDetail: function() { //批量抓取店铺详细
        var _this = this;
        //console.log();
        if (!_this.pathIsExit(path.join(__dirname, 'shopCrawl.log'), true)) {
            fs.writeFileSync(path.join(__dirname, 'shopCrawl.log'), '0,' + config.onceShopItm);
        }
        var shopCrawlConfig = _this.readFile(path.join(__dirname, 'shopCrawl.log')).split(',');
        var s = parseInt(shopCrawlConfig[0]);
        var e = parseInt(shopCrawlConfig[1]);
        var endIndex = (s + e) - 1;
        // var shopData = JSON.parse('[' + _this.readFile(path.join(__dirname, 'oldStoreData/storeLinks.js')) + ']');
        var shopData = _this.shopsLinkData();
        if (s >= shopData.length) {
            console.log('已抓取所有店铺！');
            return false;
        }
        try {
            for (var i = 0; i < e; i++) {
                console.log('i=' + i);
                //var i = j;
                _this.getShopDetail(shopData[i + s], 1, i + s, endIndex);
            }
        } catch (err) {
            console.log(err);
        }
    },
    pageNum: 1,
    storeRegExp: new RegExp(/^storeName\d+(.js)$/),
    allStoreItm: function() { //聚合所有店铺列表信息
        var _this = this;
        var storeFiles = fs.readdirSync(path.join(__dirname, 'oldStoreData'));
        var storeLinks = [];
        storeFiles.forEach(function(itm) {
            if (_this.storeRegExp.test(itm)) { //读取storeName文件
                var data = '[' + _this.readFile(path.join(__dirname, 'oldStoreData/' + itm)) + ']';
                JSON.parse(data).forEach(function(linkItm) {
                    var itmObj = {
                        'name': linkItm.shopName,
                        'link': linkItm.shopHref,
                        'id': linkItm.shopHref.replace(/[^\d]/g, ''),
                        'tel': linkItm.shopTel,
                        'qq': linkItm.shopQQ,
                        'market': linkItm.shopMarket,
                        'address': linkItm.address,
                        'major': linkItm.shopMain
                    };
                    storeLinks.push(JSON.stringify(itmObj));
                });
            }
        });
        fs.writeFile(path.join(__dirname, 'oldStoreData/storeLinks.js'), storeLinks.join(',\n'), function(err) {
            if (err) {
                console.info('提取店铺url失败' + err);
            } else {
                console.info('提取店铺url成功');
                console.log('总计纪录：' + storeLinks.length);
            }
        });

    },
    crawlShopLater: function() {
        console.info('抓取店铺定时器启动！');
        var _this = this;
        var sched = later.parse.text('every 3 minutes');
        var timer = later.setInterval(function() { _this.writeShopDetail() }, sched);
        var shopNum = _this.shopsLinkData().length;
        console.info(shopNum);
        if (_this.getShopCrawlLog()[0] >= shopNum) {
            timer.clear();
        }
    },
    crawlGoodsLater:function(){
        console.info('抓取商品定时器启动！');
        var _this=this;
        var shopData=_this.shopsLinkData();
        var shopNum = shopData.length;
        var sched = later.parse.text('every 20 seconds');
        var timer = later.setInterval(function() { 
            var goodsIndex=parseInt(_this.getGoodsCrawlLog());
            var floderPath=path.join(__dirname,'oldStoreData/store'+shopData[goodsIndex].id+'_'+goodsIndex);
            _this.getGoodsDetail(floderPath,goodsIndex);
        }, sched);
        if (parseInt(_this.getGoodsCrawlLog()) >= shopNum) {
            timer.clear();
        }

    },
    appendFile: function(filePath, data) {
        fs.appendFileSync(filePath, data);
    },
    testLater: function() {
        var _this = this;
        console.log(_this.getShopCrawlLog());
        if (!_this.pathIsExit(path.join(__dirname, 'shopCrawl.log'))) {
            fs.writeFileSync(path.join(__dirname, 'shopCrawl.log'), '0,' + config.onceShopItm);
        }
        later.date.localTime();
        var sched = later.parse.text('every 10 seconds');
        var index = 0;
        var timer = later.setInterval(testFun, sched);

        function testFun() {
            if (index >= 10) {
                timer.clear();
            }
            console.log(index++);
            console.log(utils.dateFormat(new Date().getTime(), 'yyyy-MM-dd hh:mm:ss') + ':hello world!');
        }
    }
};
//main.writeShopDetail();
//main.getGoodsDetail();
(function() {
    var args = process.argv;
    switch (args[2]) {
        case 'allStoreItm':
            console.log('开始合并店铺列表');
            main.allStoreItm();
            break;
        case 'writeShopList':
            console.log('开始获取店铺列表');
            main.getShopPage();
            break;
        case 'writeGoodsDetail':
            console.log('开始获取商品详情');
            main.getGoodsDetail(path.join(__dirname, 'oldStoreData/store47_29'));
            break;
        case 'writeShopDetail':
            console.log('开始获取店铺详情');
            main.writeShopDetail();
            break;
        case 'testGoods':
            main.testGoods();
            break;
        case 'testLater':
            main.testLater();
            break;
        case 'crawlShopLater':
            main.crawlShopLater();
            break;
        case 'crawlGoodsLater':
            main.crawlGoodsLater();
            break;
        default:
            console.log('开始获取店铺列表');
           main.getShopPage();
            break;
    }
})();
