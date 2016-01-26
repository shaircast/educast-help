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
})(window, anchors);
