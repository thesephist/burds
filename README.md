# burds!

Just some burds.

## Development

To autoformat the source file:

```
oak fmt app.js.oak --fix
```

To recompile the JavaScript bundle from [Oak](https://oaklang.org) sources:

```
oak build --entry app.js.oak -o bundle.js --web
```

To do this on every save of `app.js.oak` with [entr](https://eradman.com/entrproject/):

```
ls *.oak | entr -cr oak build --entry app.js.oak -o bundle.js --web
```

