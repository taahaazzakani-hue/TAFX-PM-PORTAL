import path from 'node:path';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const project = path.resolve(import.meta.dirname, '..');
const destination = path.resolve(project, '..');
const require = createRequire(path.join(project, 'package.json'));
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const result = await build({
  absWorkingDir: project,
  entryPoints: ['src/main.jsx'],
  bundle: true,
  splitting: false,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  jsx: 'automatic',
  minify: true,
  write: false,
  outdir: path.join(project, '.direct-open-build'),
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.BASE_URL': '"./"',
  },
  plugins: [{
    name: 'embedded-local-branding',
    setup(builder) {
      builder.onLoad({ filter: /assets\.js$/ }, async args => {
        if (args.path !== path.join(project, 'src/assets.js')) return;
        const contents = await readFile(args.path, 'utf8');
        const logo = await readFile(path.join(project, 'public/favicon.png'));
        return {
          contents: contents.replace(
            /export const LOGO\s*=\s*[^;]+;/,
            () => `export const LOGO = ${JSON.stringify(`data:image/png;base64,${logo.toString('base64')}`)};`,
          ),
          loader: 'js',
          resolveDir: path.dirname(args.path),
        };
      });
    },
  }],
});
const javascript = result.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = result.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n');
let html = await readFile(path.join(project, 'index.html'), 'utf8');
html = html.replace('href="/favicon.png"', 'href="./favicon.png"');
html = html.replace('</head>', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>\n</head>`);
html = html.replace(
  /<script type="module" src="\.\/src\/main\.jsx"><\/script>/,
  () => `<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script>`,
);
await writeFile(path.join(destination, 'index.html'), html);
await mkdir(path.join(destination, 'media'), { recursive: true });
for (const name of ['taahafx-desktop.mp4', 'taahafx-desktop.webm', 'taahafx-desktop-poster.jpg']) {
  await copyFile(path.join(project, 'public/media', name), path.join(destination, 'media', name));
}
for (const name of ['favicon.png', 'favicon.svg', 'robots.txt']) {
  await copyFile(path.join(project, 'public', name), path.join(destination, name));
}
console.log('Built double-clickable index.html with inline JavaScript/CSS and local looping video.');
