module.exports = function (grunt) {
    var makeJekyllName = (function () {
        var cache = {},
            Path = require('path'),
            dateFormat = require('dateformat');
        return function (path) {
            var nfc_path = path.normalize('NFC');
            if (!cache[nfc_path]) {
                var basename = Path.parse(path).name,
                    parts = basename.split('_'), slug;

                if (parts.length < 2) {
                    slug = 'empty';
                } else {
                    slug = parts[1];
                }
                cache[nfc_path] = dateFormat(
                    gitDate.getDate(path), 'yyyy-mm-dd'
                ) + '-' + slug;
            }
            return cache[nfc_path];
        };
    })();
    var replaceUrl = (function () {
        var cache = {},
            Path = require('path'),
            dateFormat = require('dateformat');

        return function (path, url) {
            var url_base, fragment, norm_path, nfc_norm_path, new_url_base;

            if (url.startsWith('https://') || url.startsWith('https://')) {
                return url;
            }

            if (url.indexOf('#') > -1) {
                var splitted = url.split('#');
                url_base = splitted.shift();
                fragment = splitted.join('#');
            } else {
                url_base = url;
                fragment = '';
            }

            norm_path = Path.normalize(Path.join(path, url_base));
            nfc_norm_path = norm_path.normalize('NFC');
            if (!grunt.file.isFile(norm_path)) {
                return url;
            }

            if (cache[nfc_norm_path]) {
                new_url_base = cache[nfc_norm_path];
            } else {
                new_url_base = (
                    "{% post_url " + makeJekyllName(norm_path) + " %}"
                );
                cache[nfc_norm_path] = new_url_base;
            }

            return new_url_base + (
                fragment.length > 0 ? ('#' + fragment) : ''
            );
        };
    })();

    var gitDate = (function () {
        var cache = {},
            Github = require('github'),
            github = new Github({
                debug: false, version: "3.0.0"
            });

        if (process.env.GH_TOKEN) {
            github.authenticate({
                type: "oauth", token: process.env.GH_TOKEN
            });
        }

        return {
            fetchDate: function (path, callback) {
                var ref_splitted = process.env.GH_REF.split('/'),
                    user = ref_splitted[0], repo = ref_splitted[1],
                    nfc_path = path.normalize('NFC');

                github.repos.getCommits({
                    user: user, repo: repo, path: nfc_path
                }, function (err, result) {
                    var date;
                    if (result.length > 0) {
                        date = new Date(result[0].commit.author.date);
                    } else {
                        date = new Date();
                    }
                    cache[nfc_path] = date;
                    callback(err, date);
                });
            },
            getDate: function (path) {
                var nfc_path = path.normalize('NFC');
                if (cache[nfc_path]) {
                    return cache[nfc_path];
                } else {
                    return null;
                }
            }
        };
    })();

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-git');
    grunt.initConfig({
        GH_REF: process.env.GH_REF,
        GH_TOKEN: process.env.GH_TOKEN,
        GH_EMAIL: process.env.GH_EMAIL,
        GH_USERNAME: process.env.GH_USERNAME,
        clean: {
            dist: ['dist'],
            distPosts: ['dist/_posts/*']
        },
        gitclone: {
            dist: {
                options: {
                    repository: 'https://github.com/<%= GH_REF %>.git',
                    branch: 'gh-pages',
                    depth: 1,
                    directory: 'dist'
                }
            }
        },
        gitadd: {
            dist: {
                options: {
                    cwd: 'dist',
                    all: true
                }
            }
        },
        gitcommit: {
            dist: {
                options: {
                    cwd: 'dist',
                    message: 'Update Help Center Pages',
                    allowEmpty: true
                }
            }
        },
        gitpush: {
            dist: {
                options: {
                    cwd: 'dist',
                    branch: 'gh-pages',
                    remote: (
                        'https://<%= GH_TOKEN %>@github.com/<%= GH_REF %>.git'
                    )
                }
            }
        },
        gitconfig: {
            distSet: {
                options: {
                    cwd: 'dist',
                    email: '<%= GH_EMAIL %>',
                    username: '<%= GH_USERNAME %>'
                }
            },
            distUnset: {
                options: {
                    cwd: 'dist'
                }
            }
        }
    });

    grunt.registerMultiTask('gitconfig', 'Git Configuration', function () {
        var options = this.data.options, emailArgs, usernameArgs,
            done = (function () {
                var count = 2, doneInternal = this.async();
                return function () {
                    count -= 1;
                    if (count == 0) {
                        doneInternal();
                    }
                };
            }).bind(this)();

        if (!!options.email) {
            emailArgs = [
                '-C', options.cwd || '.', 'config', 'user.email', options.email
            ];
        } else {
            emailArgs = [
                '-C', options.cwd || '.', 'config', '--unset', 'user.email'
            ];
        }

        if (!!options.username) {
            usernameArgs = [
                '-C', options.cwd || '.',
                'config', 'user.name', options.username
            ];
        } else {
            usernameArgs = [
                '-C', options.cwd || '.', 'config', '--unset', 'user.name'
            ];
        }
        grunt.util.spawn({
            cmd: 'git', args: emailArgs
        }, function (error, result, code) {
            done();
        });
        grunt.util.spawn({
            cmd: 'git', args: usernameArgs
        }, function (error, result, code) {
            done();
        });
    });

    grunt.registerTask(
        'convert', 'Convert posts to jekyll format', function () {
            var gitDateWaits = [], done = this.async(),
                Q = require('q');

            grunt.file.recurse('help', function (abs, r, s, f) {
                gitDateWaits.push(Q.promise(function (resolve, rejct, notify) {
                    gitDate.fetchDate(abs, function (err, date) {
                        resolve();
                    });
                }));
            });

            Q.all(gitDateWaits).then(function () {
                grunt.file.recurse('help', function (abs, root, sub, filename) {
                    if (!filename.endsWith('.md')) {
                        return;
                    }

                    var category = sub.replace(/\//g, ' '),
                        name_parts = filename.replace('.md', '').split('_');

                    if (name_parts.length != 3) {
                        return;
                    }

                    var order = parseInt(name_parts[0]), slug = name_parts[1],
                        title = name_parts[2].replace(/-/g, ' '),
                        new_abs = "dist/_posts/" + makeJekyllName(abs) + '.md',
                        prepend = ['---', 'title: ' + title,
                                   'category: ' + category, 'order: ' + order,
                                   '---'].join('\n'),
                        content = grunt.file.read(abs, {encoding: 'utf-8'}),
                        new_content = prepend + '\n' + content.replace(
                                /\[(.*?)\]\((.*?)\)/g,
                            function (str, name, url) {
                                return "[" + name + "]" + "(" +
                                    replaceUrl(root + "/" + sub, url) +")";
                            }
                        );
                    grunt.log.write(abs + " => " + new_abs + "\n");

                    grunt.file.write(new_abs, new_content.normalize('NFC'), {
                        encoding: 'utf-8'
                    });
                });
                done();
            });
        }
    );

    grunt.registerTask('build', [
        'clean:dist', 'gitclone:dist', 'clean:distPosts', 'convert'
    ]);

    grunt.registerTask('deploy', [
        'build', 'gitconfig:distSet', 'gitcommit:dist',
        'gitconfig:distUnset', 'gitpush:dist',
    ]);
};
