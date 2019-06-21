const path = require("path");
const webpack = require("webpack");

module.exports = env => {
  return {
    mode: "development",
    entry: {
      main: "./src/index.js"
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "statickit.js",
      publicPath: "/" // used by webpack-dev-middleware
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
        PRODUCTION: JSON.stringify(env.production),
        STATICKIT_URL: env.production
          ? JSON.stringify("https://api.statickit.com")
          : JSON.stringify("http://localhost:4000")
      })
    ]
  };
};
