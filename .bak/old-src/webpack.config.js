const merge = require("webpack-merge")

const path = require("path")
const fs = require("fs")

const chalk = require("chalk")

module.exports = function config(self) {
  const mode = self.mode

  // `self` is the compiler
  const baseConfig = require("./webpack.base.config.js")(self)

  let finalConfig = merge(
    baseConfig,
    mode === "development"
      ? require("./webpack.dev.config")(self)
      : require("./webpack.prod.config")(self)
  )

  const clientConfigPath = path.resolve(self.themePath, "./webpack.config.js")

  if (fs.existsSync(clientConfigPath)) {
    const clientConfig = require(clientConfigPath)

    if (typeof clientConfig === "function") {
      // When client config is a function
      const processedConfig = clientConfig(finalConfig, self, merge)
      if (typeof processedConfig !== "object") {
        console.log(
          chalk.red(
            "You did not return a webpack object from webpack.config.js"
          )
        )
      } else {
        console.log(
          chalk.magenta(">> Using client webpack ./webpack.config.js")
        )
        finalConfig = processedConfig
      }
    } else if (typeof clientConfig === "object" && clientConfig !== null) {
      console.log(
        chalk.magenta(">> Merging client webpack [./webpack.config.js]")
      )
      finalConfig = merge(finalConfig, clientConfig)
    } else {
      console.log(
        chalk.red(
          "You should only export a function or a webpack config object from webpack.config.js"
        )
      )
    }
  }

  // console.log(finalConfig)
  // process.exit()
  return finalConfig
}
