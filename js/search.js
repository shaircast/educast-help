(function (window, lunr, superagent, domUtils, anchors) {
    (function (lunr) {
        var ltrim_pattern = (
                /^[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]+/gi
        ), rtrim_pattern = (
                /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]+$/gi
        ), f = function (token) {
            return token.replace(ltrim_pattern, '')
                .replace(rtrim_pattern, '');
        };
        lunr.Pipeline.registerFunction(f, 'unicodeTrimmer');
        return f;
    })(lunr);

    var q = (function (window) {
        var result = /q=?([^&]*)/g.exec(
            window.location.href.replace(/.*\?/g, '')
        );
        return result.length < 2 ?
            null : window.decodeURIComponent(result[1])
            .trim().replace(/\++/g, ' ');
    })(window),
        searchContentView = (function (document, domUtils, anchors) {
            var resultsSection =
                    document.querySelector(".search-result-box .results"),
                loadingSection =
                    document.querySelector(".search-result-box .loading"),
                emptySection =
                    document.querySelector(".search-result-box .empty"),
                noKeywordSection =
                    document.querySelector(".search-result-box .no-keyword"),
                errorSection =
                    document.querySelector(".search-result-box .error"),
                allSections = [resultsSection, loadingSection, noKeywordSection,
                               emptySection, errorSection],
                hideAll = function () {
                    allSections.forEach(function (section) {
                        domUtils.addClass(section, 'hide');
                    });
                },
                resultTemplate = function (content) {
                    var tempDiv = document.createElement('div'),
                        contentHtml = [
                            '<article class="post-content">',
                            '<h4><a href="', content.url, '">',
                            content.title, '</a></h4>',
                            '<p>', content.body, '</p>',
                            '</article>'
                        ].join('');

                    tempDiv.innerHTML = contentHtml;
                    return tempDiv.firstChild;
                };

            return {
                error: function () {
                    hideAll();
                    domUtils.removeClass(errorSection, 'hide');
                },
                loading: function () {
                    hideAll();
                    domUtils.removeClass(loadingSection, 'hide');
                },
                noKeyword: function () {
                    hideAll();
                    domUtils.removeClass(noKeywordSection, 'hide');
                },
                results: function (results) {
                    hideAll();
                    if (results.length === 0) {
                        domUtils.removeClass(emptySection, 'hide');
                        emptySection.querySelector('.keyword').innerText = q;
                        return;
                    }
                    domUtils.removeClass(resultsSection, 'hide');

                    resultsSection.querySelector('.keyword').innerText = q;
                    results.forEach(function (content) {
                        resultsSection.appendChild(resultTemplate(content));
                    });
                }
            };

        })(window.document, domUtils, anchors),
        onError = function () { searchContentView.hide(); };

    if (q.length == 0) {
        searchContentView.noKeyword();
        return;
    } else {
        var searchInput = document.querySelector('input[name="q"]');
        searchInput.value = q;
    }

    (function (onError, resolve) {
        superagent.get('/search/index.json')
            .end(function (err, res) {
                if (err) {
                    onError(err);
                }
                var index = lunr.Index.load(res.body),
                    searchResults = index.search(q);
                resolve(searchResults);
            });
    })(onError, (function (onError, resolve) {
        return function (searchResults) {
            if (searchResults.length == 0) {
                resolve([]);
            }
            superagent.get('/search/content.json')
                .end(function (err, res) {
                    if (err) {
                        onError(err);
                    }
                    resolve(searchResults.map(function (sv) {
                        var match = res.body.filter(function (content) {
                            return sv.ref === content.id;
                        });
                        return match.length > 0 ? match[0] : undefined;
                    }).filter(function (value) {
                        return typeof value !== "undefined";
                    }));
                });
        };
    })(onError, function (results) {
        searchContentView.results(results);
    }));

})(window, window.lunr, window.superagent, window.domUtils, window.anchors);
