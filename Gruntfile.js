module.exports = function (grunt) {
    var CLOUDFLARE_AUTH_EMAIL = process.env.CLOUDFLARE_AUTH_EMAIL,
        CLOUDFLARE_AUTH_KEY = process.env.CLOUDFLARE_AUTH_KEY,
        CLOUDFLARE_DOMAIN = process.env.CLOUDFLARE_DOMAIN,
        common_header = {
            'X-Auth-Email': CLOUDFLARE_AUTH_EMAIL,
            'X-Auth-Key': CLOUDFLARE_AUTH_KEY
        };

    grunt.registerTask('purge-cache', 'Cloudflare Cache Purge', function () {
        var done = this.async(), request = require('request');

        request({
            url: 'https://api.cloudflare.com/client/v4/zones',
            qs: {
                name: CLOUDFLARE_DOMAIN
            },
            json: true,
            headers: common_header
        }, function (err, response, body) {
            if (!!err) {
                grunt.log.write(err);
                done(false);
                return;
            }

            if (response.statusCode != 200) {
                grunt.log.write("Status code: " + response.statusCode + '\n');
                grunt.log.write(require('util').inspect(body, {depth: null}));
                done(false);
                return;
            }

            if (!body.result ||
                !body.result.length || body.result.length == 0) {
                grunt.log.write("Bad response data");
                done(false);
                return;
            }

            var zone_id = body.result[0].id;

            // Clear Cache
            request({
                method: 'DELETE',
                url: (
                    'https://api.cloudflare.com/client/v4/zones/'
                        + zone_id + '/purge_cache'
                ),
                json: true,
                headers: common_header,
                body: {
                    purge_everything: true
                }
            }, function (err, response, body) {
                if (!!err) {
                    grunt.log.write(err);
                    done(false);
                    return;
                }

                if (response.statusCode != 200) {
                    grunt.log.write(
                        "Status code: " + response.statusCode + '\n'
                    );
                    grunt.log.write(
                        require('util').inspect(body, {depth: null})
                    );
                    done(false);
                    return;
                }

                grunt.log.write("Purge cache succesfully!");
                done();
            });
        });
    });
};
