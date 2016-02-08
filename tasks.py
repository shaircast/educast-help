from invoke import ctask as task
import contextlib
import dateutil.parser
import os
import re


_GH_REF = os.environ.get("GH_REF")
_GH_TOKEN = os.environ.get("GH_TOKEN")


@contextlib.contextmanager
def chdir(dirname=None):
    cur_dir = os.getcwd()
    try:
        if dirname is not None:
            os.chdir(dirname)
        yield
    finally:
        os.chdir(cur_dir)


@task
def clean(ctx):
    with chdir():
        ctx.run("rm -rf ./dist")


@task
def fetch(ctx):
    with chdir():
        ctx.run(
            "git clone -b %s https://%s %s" % ("gh-pages", _GH_REF, "dist")
        )


@task
def commit(ctx):
    with chdir("./dist"):
        ctx.run("git add -A")
        ctx.run(
            (
                'git -c user.name="%s" -c user.email="%s" '
                'commit --allow-empty -a -m "%s"'
            ) % (
                "TNTcrowd", "devmaster@tntcrowd.com",
                "Update Help Center Message"
            )
        )


@task
def push(ctx):
    with chdir("./dist"):
        ctx.run(
            "git push https://%s@%s %s" % (_GH_TOKEN, _GH_REF, "gh-pages")
        )


@task
def convert(ctx):
    _convert_url_cache = {}

    def convert_md_url_to_post_url(current_path, url):
        if url.startswith('http://') or url.startswith('https://'):
            return url

        if '#' in url:
            url_base, fragment = url.split('#')
        else:
            url_base = url
            fragment = ''

        norm_path = os.path.normpath(os.path.join(current_path, url_base))

        if not os.path.isfile(norm_path):
            return url
        else:
            # contain check?
            if norm_path in _convert_url_cache:
                new_url_base = _convert_url_cache[norm_path]
            else:
                # Convert
                date_result = ctx.run(
                    'git log -1 --format="%%ad" -- %s' % post_path,
                    hide='both'
                )
                date = dateutil.parser.parse(date_result.stdout).date()

                file_name = os.path.basename(url_base)
                _, slug, _ = file_name.split('_')
                new_url_base = "{%% post_url %s-%s %%}" % (date, slug)

            return new_url_base if len(fragment) == 0 else '%s#%s' % (
                new_url_base, fragment
            )

    def replace_url_parts(current_path, match_obj):
        all_part = match_obj.group()
        url = match_obj.group('url')
        return all_part.replace(
            url, convert_md_url_to_post_url(current_path, url)
        )

    # Clean existing posts
    ctx.run("rm -rf ./dist/_posts/*")

    for category in os.listdir('./help'):
        category_path = os.path.join('./help', category)
        if os.path.isfile(category_path):
            continue
        for post in os.listdir(category_path):
            post_path = os.path.join(category_path, post)

            if not os.path.isfile(post_path):
                continue

            post_name, ext = os.path.splitext(post)

            if not ext == '.md':
                continue

            order, slug, title = post_name.split('_')
            title = title.replace('-', ' ')

            date_result = ctx.run(
                'git log -1 --format="%%ad" -- %s' % post_path,
                hide='both'
            )
            date = dateutil.parser.parse(date_result.stdout).date()

            with open(post_path, 'r') as f:
                content = f.read()
                md_url_pattern = r"\[.*?\]\((?P<url>.*?)\)"

                new_content = re.sub(
                    md_url_pattern,
                    lambda m: replace_url_parts(category_path, m),
                    content
                )

                prepend_data = '\n'.join([
                    "---", "title: %s" % title,
                    "category: %s" % category,
                    "order: %d" % int(order), "---"
                ])

                new_content = '%s\n%s' % (prepend_data, new_content)

            new_file_path = "./dist/_posts/%s-%s.md" % (date, slug)

            with open(new_file_path, 'w') as f:
                f.write(new_content)


@task(pre=[clean, fetch, convert])
def build(ctx):
    pass


@task
def test(ctx):
    asdf = ctx.run('ls')
    print(asdf.stdout)


@task(pre=[build], post=[commit, push])
def deploy(ctx):
    pass
