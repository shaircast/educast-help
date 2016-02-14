(function (window, anchors) {
    window.makeHeaderLink = function (selector) {
        var item_urlify = function (item) {
            var url_part = anchors.urlify(item.text.trim());
            item.href += '#' + url_part;
        };
        var items = window.document.querySelectorAll(selector);
        for (var i = 0; i < items.length; i++) {
            item_urlify(items[i]);
        }
    };
    window.domUtils = {
        addClass: function (dom, className) {
            if (!dom) {
                return;
            }
            if (!!dom.classList) {
                dom.classList.add(className);
            } else {
                var classList = dom.className.split(' '),
                    idx = classList.indexOf(className);

                if (idx < 0) {
                    classList.push(className);
                    dom.className = classList.join(' ');
                }
            }
        },
        removeClass: function (dom, className) {
            if (!dom) {
                return;
            }
            if (!!dom.classList) {
                dom.classList.remove(className);
            } else {
                var classList = dom.className.split(' '),
                    idx = classList.indexOf(className);

                if (idx > -1) {
                    classList.splice(idx, 1);
                    dom.className = classList.join(' ');
                }
            }
        }
    };
})(window, window.anchors);
