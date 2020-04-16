// @remove-on-eject-begin
/**
 * Copyright (c) 2019-present, https://github.com/devloco
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');
// @remove-on-eject-begin
// Do the preflight check (only happens before eject).
const verifyPackageTree = require('./utils/verifyPackageTree');
if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
  verifyPackageTree();
}
const verifyTypeScriptSetup = require('./utils/verifyTypeScriptSetup');
verifyTypeScriptSetup();
// @remove-on-eject-end

const fs = require('fs-extra'); // wptheme - touched
const chalk = require('react-dev-utils/chalk');
const webpack = require('webpack');
//const WebpackDevServer = require('webpack-dev-server'); // wptheme - remarked out
const clearConsole = require('react-dev-utils/clearConsole');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const openBrowser = require('react-dev-utils/openBrowser');
const paths = require('../config/paths-wptheme'); // wptheme - touched
const configFactory = require('../config/webpack.config.wptheme'); // wptheme - touched
//const createDevServerConfig = require('../config/webpackDevServer.config'); // wptheme - remarked out

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Tools like Cloud9 rely on this.
// const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
// const HOST = process.env.HOST || '0.0.0.0';

// if (process.env.HOST) {
//   console.log(
//     chalk.cyan(
//       `Attempting to bind to HOST environment variable: ${chalk.yellow(
//         chalk.bold(process.env.HOST)
//       )}`
//     )
//   );
//   console.log(
//     `If this was unintentional, check that you haven't mistakenly set it in your shell.`
//   );
//   console.log(
//     `Learn more here: ${chalk.yellow('https://bit.ly/CRA-advanced-config')}`
//   );
//   console.log();
// }

// wptheme - added section - start
const config = configFactory('development');
const appPackage = require(paths.appPackageJson);
const wpThemeUserConfig = require('@devloco/create-react-wptheme-utils/getUserConfig')(
  paths,
  process.env.NODE_ENV
);
const wpThemePostInstallerInfo = require('@devloco/create-react-wptheme-utils/postInstallerInfo');
const wpThemeFileFunctions = require('@devloco/create-react-wptheme-utils/fileFunctions');

const copyPublicFolder = wpThemeFileFunctions.copyPublicFolder;
const copyToThemeFolder = wpThemeFileFunctions.copyToThemeFolder;
const deleteDeployFolder = wpThemeFileFunctions.deleteDeployFolder;
const setupCopyToThemeFolder = wpThemeFileFunctions.setupCopyToThemeFolder;
const writeDoNotEditFile = wpThemeFileFunctions.writeDoNotEditFile;

const _wpThemeServer =
  wpThemeUserConfig &&
  wpThemeUserConfig.wpThemeServer &&
  wpThemeUserConfig.wpThemeServer.enable === true
    ? require('@devloco/create-react-wptheme-utils/wpThemeServer')
    : null;
// wptheme - added section - end

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require('react-dev-utils/browsersHelper');
checkBrowsers(paths.appPath, isInteractive).then(() => {
  // Using setTimeout just to put the call to startWatch() at the top of the file.
  setTimeout(() => {
    startWatch();
  }, 0);
});

function startWatch() {
  // Remove all content but keep the directory so that
  // if you're in it, you don't end up in Trash
  fs.emptyDirSync(paths.appBuild);
  fs.emptyDirSync('../static');

  // Going into Dev mode, so delete the deploy folder.
  deleteDeployFolder(paths);

  const injectWpThemeClient = function (wpThemeServer) {
    if (!wpThemeUserConfig) {
      return;
    }

    let clientConfig = wpThemeUserConfig.injectWpThemeClient;
    if (clientConfig) {
      clientConfig.mode =
        clientConfig.mode === 'disable' ? clientConfig.mode : 'afterToken';
      clientConfig.token = '<head>';
    }

    if (!clientConfig || clientConfig.mode === 'disable') {
      return;
    }

    if (typeof clientConfig.override === 'function') {
      clientConfig.override.call();
      return;
    }

    let toInject = wpThemeServer.getClientInjectString(
      clientConfig.mode,
      clientConfig.token
    );

    if (fs.existsSync(clientConfig.file)) {
      let fileContents = fs.readFileSync(clientConfig.file, 'utf8');

      if (clientConfig.mode === 'endOfFile') {
        fileContents += toInject;
      } else {
        fileContents = fileContents.replace(clientConfig.token, toInject);
      }

      fs.writeFileSync(clientConfig.file, fileContents);
    } else {
      console.log(
        chalk.red(
          `wpstart::injectWpThemeClient: ${clientConfig.file} was not found.`
        )
      );
      process.exit();
    }
  };

  let doLaunchBrowser = true;
  const launchBrowser = function () {
    openBrowser(appPackage.browserLaunchTo);
  };

  const webpackOutputFormat = {
    chunks: false, // Makes the build much quieter
    children: false,
    colors: true,
    modules: false,
  };

  return new Promise((resolve, reject) => {
    const watchOptions = {
      aggregateTimeout: 300,
      poll: undefined,
    };

    // print the post init instructions
    // doLaunchBrowser is only true on startup
    if (
      doLaunchBrowser &&
      isInteractive &&
      wpThemePostInstallerInfo.postInstallerExists(paths)
    ) {
      clearConsole();
      copyToThemeFolder(paths);
      setupCopyToThemeFolder(paths);
      console.log('Nodejs watcher is exiting...');
      console.log(`${chalk.red('Your theme is not quite ready!')}`);
      console.log(
        "Now go to your WP site's admin area and set the site's theme to this new theme."
      );
      console.log(
        `Then click "${chalk.cyan(
          'Visit Site'
        )}" to complete the PHP portion of the setup.`
      );
      console.log(
        chalk.green('Once that is done, restart the Nodejs watcher.')
      );

      process.exit();
    }

    // Launch the refresh websocket server
    // doLaunchBrowser is only true on startup
    if (doLaunchBrowser && _wpThemeServer) {
      _wpThemeServer.startServer(paths);
    }

    const appName = require(paths.appPackageJson).name;
    const useTypeScript = fs.existsSync(paths.appTsConfig);
    const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true';

    const urls = {
      localUrlForTerminal: appPackage.browserLaunchTo,
    };

    const devSocket = {
      warnings: (warnings) => {
        if (_wpThemeServer) {
          _wpThemeServer.update(warnings, 'warnings');
        }
      },
      errors: (errors) => {
        if (_wpThemeServer) {
          _wpThemeServer.update(errors, 'errors');
        }
      },
    };

    // Create a webpack compiler that is configured with custom messages.
    const compiler = createCompiler({
      appName,
      config,
      devSocket,
      urls,
      useYarn,
      useTypeScript,
      tscCompileOnError,
      webpack,
    });

    const watcher = compiler.watch(watchOptions, (err, stats) => {
      if (err) {
        // starting the watcher failed.
        return console.log(err);
      }

      if (isInteractive) {
        let buildCommand = useYarn ? 'yarn build' : 'npm run build';
        clearConsole();

        // We used to support resolving modules according to `NODE_PATH`.
        // This now has been deprecated in favor of jsconfig/tsconfig.json
        // This lets you use absolute paths in imports inside large monorepos:
        if (process.env.NODE_PATH) {
          console.log(
            chalk.yellow(
              'Setting NODE_PATH to resolve modules absolutely has been deprecated in favor of setting baseUrl in jsconfig.json (or tsconfig.json if you are using TypeScript) and will be removed in a future major release of create-react-app.'
            )
          );
          console.log();
        }

        console.log(stats.toString(webpackOutputFormat));
        console.log();
        console.log('Note that the development build is not optimized.');
        console.log(
          `To create a production build, use ${chalk.cyan(buildCommand)}.`
        );
        console.log();
      }

      if (typeof stats.hasErrors === 'function' && !stats.hasErrors()) {
        // Merge with the public folder
        copyPublicFolder(paths);
      }

      injectWpThemeClient(_wpThemeServer);
      copyToThemeFolder(paths);
      writeDoNotEditFile(paths);

      if (_wpThemeServer) {
        _wpThemeServer.update(stats);
      }

      if (doLaunchBrowser) {
        launchBrowser();
      }

      doLaunchBrowser = false;
    });

    ['SIGINT', 'SIGTERM'].forEach(function (sig) {
      process.on(sig, function () {
        watcher.close();
        process.exit();
      });
    });

    if (isInteractive || process.env.CI !== 'true') {
      // Gracefully exit when stdin ends
      process.stdin.on('end', function () {
        devServer.close();
        process.exit();
      });
      process.stdin.resume();
    }
  }).catch((err) => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
}
