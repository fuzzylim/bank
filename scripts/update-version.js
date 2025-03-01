const fs = require("fs")
const path = require("path")

const packageJsonPath = path.join(__dirname, "..", "package.json")
const packageJson = require(packageJsonPath)

const [major, minor, patch] = packageJson.version.split(".").map(Number)
const newVersion = `${major}.${minor}.${patch + 1}`

packageJson.version = newVersion

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

console.log(`Updated version to ${newVersion}`)

// Set the new version as an environment variable
process.env.NEXT_PUBLIC_APP_VERSION = newVersion

