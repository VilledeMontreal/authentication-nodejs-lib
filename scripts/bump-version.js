const rootPackage = require('../package.json');
const fs = require("fs");

DEBUG = false;

function bumpPackage(folder, version) {
  console.log('processing package', folder)
  const pkg = JSON.parse(fs.readFileSync(`${folder}/package.json`));
  pkg.version = version;
  const deps = pkg.dependencies;
  if (deps)  {
    for (const [depName, depVersion] of Object.entries(deps)) {
      if (depName.startsWith('@villedemontreal/auth-')) {
        deps[depName] = `^${version}`;
      }
    }
  }
  fs.writeFileSync(`${folder}/package.json`, JSON.stringify(pkg, null, 2));
  if (DEBUG) {
    console.log(pkg);
  }
  return pkg;
}

const packages = rootPackage.workspaces;
for (const pkg of packages) {
  bumpPackage(pkg, rootPackage.version);
}
