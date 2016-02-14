(function (window, anchors) {
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
