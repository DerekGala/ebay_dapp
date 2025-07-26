const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: ["./src/components.js", "./src/data-service.js", "./src/index.js"],
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: "./src/index.html", to: "index.html" },
      { from: "./src/list-item.html", to: "list-item.html" },
      { from: "./src/product.html", to: "product.html" },
      { from: "./src/arbiter.html", to: "arbiter.html" },
      { from: "./src/dashboard.html", to: "dashboard.html" },
      { from: "./src/product-status.html", to: "product-status.html" },
      { from: "./src/network-status.html", to: "network-status.html" },
      { from: "./src/styles.css", to: "styles.css" },
    ]),
  ],
  devServer: { 
    contentBase: path.join(__dirname, "dist"), 
    compress: true,
    port: 8080,
    hot: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
