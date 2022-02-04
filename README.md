# burds! 🐦

[**burds!**](https://burds.vercel.app/) is a weekend hack inspired by [this fabulous tweet](https://twitter.com/LoekVugs/status/1488140798671663104). It's a little web experiment with tiny animated birds jumping around their tiny little world. If you like this project, you may also like [Tiny Humans](https://tinyhumans.vercel.app/).

**burds!** is written entirely in [Oak](https://oaklang.org), my toy programming language that conveniently compiles to JavaScript. Everything except the title text is rendered using 2D Canvas APIs.

![Screenshot of burds](/img/screenshot-full.jpg)

## Development

**burds!** is a static, single-page app. It lives in `index.html`. Development is done using the `oak` CLI, which you can get from [oaklang.org](https://oaklang.org/#start).

To autoformat the source file:

```sh
oak fmt app.js.oak --fix
```

To recompile the JavaScript bundle from [Oak](https://oaklang.org) sources:

```sh
oak build --entry app.js.oak -o bundle.js --web
```

Usually it's convenient to automatically do this on every save of `app.js.oak` (with [entr](https://eradman.com/entrproject/)):

```sh
ls *.oak | entr -cr oak build --entry app.js.oak -o bundle.js --web
```

_Note: As of the first release of this repository, the latest versioned Oak release is missing some standard library APIs (`math.{sqrt, hypot, scale, bearing, orient}`), so for now, you may have to build Oak from source (which is in Go) to make changes to this project. Brave souls can look more into that in the [Oak repository](https://github.com/thesephist/oak)._
