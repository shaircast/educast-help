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
        },
        addEventListener: function (dom, evt, func) {
            if (dom.addEventListener) {
                dom.addEventListener(evt, func, false);
            } else if (dom.attachEvent) {
                dom.attachEvent('on' + evt, func);
            } else {
                evt = 'on' + evt;
                if (typeof dom[evt] === 'function') {
                    func = (function (f1, f2) {
                        return function () {
                            f1.apply(this, arguments);
                            f2.apply(this, arguments);
                        };
                    })(dom[evt], func);
                }
                dom[evt] = func;
            }
        }
    };
})(window, window.anchors);
