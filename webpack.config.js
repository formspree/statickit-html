const path = require("path");
const webpack = require("webpack");
const staticKitUrl = process.env.STATICKIT_URL || "https://api.statickit.com";
const nodeEnv = process.env.NODE_ENV || "production";
const mode = nodeEnv;

module.exports = (env = {}) => {
  return {
    mode: mode,
    entry: {
      main: "./src/index.js"
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "statickit.js"
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        }
      ]
    },
    devServer: {
      contentBase: path.join(__dirname, "dist")
    },
    plugins: [
      new webpack.DefinePlugin({
        PRODUCTION: JSON.stringify(nodeEnv == "production"),
        STATICKIT_URL: JSON.stringify(staticKitUrl)
      })
    ]
  };
};
