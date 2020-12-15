// ==UserScript==
// @name         GOG 匹配
// @namespace    https://github.com/wynick27
// @description  快速匹配 GOG 游戏信息
// @include      https://steamdb.keylol.com/sync
// @include      http://steamdb.sinaapp.com/sync
// @include      /https?:\/\/keylol.com\/.*/
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_removeValue
// @version      0.1
// @connect      gog.com
// @icon         https://www.gog.com/favicon.ico
// @updateURL    https://github.com/wynick27/Userscripts/raw/master/GOGInfo.user.js
// ==/UserScript==


(function () {

    function getProducts(ids) {

        var idstring = encodeURIComponent(ids.join(','));

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://api.gog.com/products?ids=' + idstring,
                timeout: 3e4,
                onload: function (res) {
                    try {
                        resolve(JSON.parse(res.response));
                    }
                    catch (err) {
                        document.getElementById('gog_page').innerHTML = '错误';
                    }
                },
                onerror: reject,
                ontimeout: reject
            });
        });
    }
    function parsePage(orders, namespace) {
        var data = [];
        orders.forEach(function (order) {
            if (order.orderStatus == 'COMPLETED') {
                order.items.forEach(function (game) {
                    if (namespace.hasOwnProperty(game.namespace)) {
                        if (data.indexOf(namespace[game.namespace]) < 0) {
                            data = data.concat(namespace[game.namespace]);
                        }
                    }
                });
            }
        });
        return data;
    }
    async function loadGOG() {
        var page = 0;
        var exit = 0;
        var data = [];
        document.getElementById('gog_page').innerHTML = `已拥有`;
        var owned = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://embed.gog.com/user/data/games',
                timeout: 3e4,
                onload: function (res) {
                    resolve(JSON.parse(res.response));
                },
                onerror: reject,
                ontimeout: reject
            });
        });
        document.getElementById('gog_page').innerHTML = `愿望单`;
        var wishlist = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://embed.gog.com/user/wishlist.json',
                timeout: 3e4,
                onload: function (res) {
                    resolve(JSON.parse(res.response));
                },
                onerror: reject,
                ontimeout: reject
            });
        });
        document.getElementById('gog_page').innerHTML = `游戏名`;
        wishlist = Object.keys(wishlist['wishlist']);
        owned = owned['owned'];
        data = {}
        var products, product;
        while (owned.length) {
            products = await getProducts(owned.splice(0, 50));
            for (product of products) {
                data[product['slug']] = 1;
            }
        }
        while (wishlist.length) {
            products = await getProducts(wishlist.splice(0, 50));
            for (product of products) {
                data[product['slug']] = 0;
            }
        }

        document.getElementById('gog_page').innerHTML = '完成';
        document.getElementById('gog_num').innerHTML = Object.keys(data).length;
        GM_setValue('gog', JSON.stringify(data));
        document.getElementById('gog_before').style.display = 'none';
        document.getElementById('gog_after').style.display = '';
    }
    function loadKeylol() {
        var data = GM_getValue('gog');
        if (data) {
            data = JSON.parse(data);
            const gogRe = /gog\.com\/game\/(\w+)/;
            const matchLinks = function () {

                document.querySelectorAll('[id^=pid] a').forEach(function (a) {
                    var match = a.href.match(gogRe)
                    if (match && data.hasOwnProperty(match[1])) {
                        a.classList.add('steam-info-link');
                        if (data[match[1]] == 1)
                            a.classList.add('steam-info-own');
                        else if (data[match[1]] == 0)
                            a.classList.add('steam-info-wish');
                    }
                });
            }
            matchLinks();
            var targetNode = document.getElementById('postlist');
            var observer = new MutationObserver(function (mutations) {
                matchLinks();
            });

            observer.observe(targetNode, { subtree: true, childList: true });

        }

    }
    if (document.URL == 'https://steamdb.keylol.com/sync' || document.URL == 'http://steamdb.sinaapp.com/sync') {
        var newspan = document.createElement('div');
        newspan.className = 'span6';
        newspan.innerHTML = '<h3>正在读取你的 GOG 游戏库 <span id="gog_page">已拥有</span></h3><div id="gog_before" class="progress progress-success progress-striped active"><div style="width: 100%;" class="bar"></div></div><div id="gog_after" style="display: none;" class="alert alert-success"><strong>成功读取并记录了 <span id="gog_num">0</span> 个条目</strong></div>';
        document.getElementById('withScript').appendChild(newspan);
        var trash = document.querySelector('.icon-trash').onclick;
        document.querySelector('#reset').onclick = function () {
            GM_deleteValue('gog');
            trash();
        }
        loadGOG();
    }
    else {
        loadKeylol();
    }
})();



