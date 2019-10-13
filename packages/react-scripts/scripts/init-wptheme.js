// @remove-file-on-eject
/**
 * Copyright (c) 2019-present, https://github.com/devloco
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const shelljs = require('@devloco/react-scripts-wptheme-utils/shell-js');
const spawn = require('react-dev-utils/crossSpawn');

module.exports = function(
  appPath,
  appName,
  verbose,
  originalDirectory,
  template,
  readmeExists,
  useTypeScript,
  useYarn
) {
  const appPackage = require(path.join(appPath, 'package.json'));
  const reactSrcName = 'react-src';

  let aOriginalDirectory = originalDirectory.replace(/\\/g, '/').split('/');
  let originalThemeName = aOriginalDirectory[aOriginalDirectory.length - 1];

  // Prefix the original create-react-app script rules with "cra"
  // so that wptheme can take over the start and build commands.
  const craCommandNames = ['build', 'eject', 'start', 'test'];
  craCommandNames.forEach(commandName => {
    let scriptRule = appPackage.scripts[commandName];
    appPackage.scripts['cra' + commandName] = scriptRule;
    delete appPackage.scripts[commandName];
  });

  // Setup the wptheme script rules
  const buildCommandName = 'build';
  const startCommandName = 'start';
  const commandNames = [
    buildCommandName,
    startCommandName,
    'wpbuild',
    'wpstart',
  ];
  commandNames.forEach(commandName => {
    appPackage.scripts[`${commandName}`] = `wptheme-scripts ${commandName}`;
  });

  // Set the app name correctly
  appPackage.name = originalThemeName;

  // rewrite package.json
  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(appPackage, null, 2) + os.EOL
  );

  // Update the theme's style.css file with the Theme Name
  let styleCssFile = path.join(appPath, '/public/style.css');
  let fileContents = fs.readFileSync(styleCssFile, 'utf8');
  let result = fileContents.replace(
    /REPLACE_WITH_THEME_NAME/g,
    originalThemeName
  );
  fs.writeFileSync(styleCssFile, result, 'utf8', 'w');

  // To use TypeScript, we need the types from Facebook's react-scripts.
  if (useTypeScript === true) {
    let command = useYarn ? 'yarn add' : 'npm install';
    let args = [verbose && '--verbose'].filter(e => e);
    args.push('react-scripts');

    console.log(`Installing react-scripts using: ${command}...`);
    console.log();

    const proc = spawn.sync(command, args, { stdio: 'inherit' });
    if (proc.status !== 0) {
      console.error(`\`${command} ${args.join(' ')}\` failed`);
      return;
    }
  }

  // if we're not on Windows, then try to chmod the folder so that the PHP portion of
  // the setup can complete (the webserver needs write access to package.json)
  if (process.platform !== 'win32') {
    function setReadWrite(file) {
      try {
        console.log(
          `${chalk.green(
            'Attempting permission change (chmod) on:'
          )}\n    ${file}`
        );
        shelljs.chmod('-R', 'go+w', file);
      } catch (error) {
        console.log();
        console.log();
        console.log(chalk.magenta('OS ERROR changing file permissions on:\n'));
        console.log('    ' + file);
        console.log('The OS error is:', error);
        console.log();
        console.log(
          `${chalk.yellow(
            'The PHP portion of setup might fail.'
          )} Your webserver needs write access to this file to complete the setup.`
        );
      }
    }

    let files = [path.resolve(originalDirectory, reactSrcName)];
    files.forEach(file => {
      setReadWrite(file);
    });
  }

  // Display the most elegant way to cd.
  // This needs to handle an undefined originalDirectory for
  // backward compatibility with old global-cli's.
  let cdPath;
  if (originalDirectory && path.join(originalDirectory, appName) === appPath) {
    appName = path.join(originalThemeName, reactSrcName);
    cdPath = appName;
  } else {
    appPath = path.join(originalThemeName, reactSrcName);
    cdPath = appPath;
  }

  // Change displayed command to yarn instead of yarnPkg
  const displayedCommand = useYarn ? 'yarn' : 'npm run';

  console.log();
  console.log(`Success! Created ${originalThemeName} at ${appPath}`);
  console.log('Inside that directory, you can run several commands:');
  console.log();
  console.log(
    "The original create-react-scripts commands are still available but must be prefixed with 'cra' (e.g. crastart, craeject, etc.)."
  );
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} ${startCommandName}`));
  console.log('    Starts the development watcher.');
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} ${buildCommandName}`));
  console.log('    Bundles the theme files for production.');
  console.log();
  console.log('We suggest that you begin by typing:');
  console.log();
  console.log(chalk.cyan('  cd'), cdPath);
  console.log(`  ${chalk.cyan(`${displayedCommand} ${startCommandName}`)}`);

  if (readmeExists) {
    console.log();
    console.log(
      chalk.yellow(
        'You had a `README.md` file, we renamed it to `README.old.md`'
      )
    );
  }

  console.log();
  console.log('Happy hacking!');
};
