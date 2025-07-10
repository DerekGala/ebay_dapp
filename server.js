var ecommerce_store_artifact = require('./build/contracts/EcommerceStore.json');
var contract = require('truffle-contract');
var Web3 = require('web3');

 //实时监听事件必须用 WebSocket provider。
//HTTP provider 只能查历史事件，不能实时推送。
const web3 = new Web3('ws://localhost:8545'); // 替换为你的节点 ws 地址
var EcommerceStore = contract(ecommerce_store_artifact);
EcommerceStore.setProvider(web3.currentProvider);

// var provider = new Web3.providers.HttpProvider('http://localhost:8545');
// var EcommerceStore = contract(ecommerce_store_artifact);
// EcommerceStore.setProvider(provider);

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var ProductModel = require('./product');
mongoose.connect('mongodb://localhost:27017/ebay_dapp')
    .then(() => console.log('MongoDB connected'));
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var express = require('express');
var app = express();

newProductEventListener();

app.use(function(req, res, next) {
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 next();
});


app.listen(3000, function() {
    console.log('Ebay Server is running on port 3000');
});

app.get("/products",(req,res)=>{
    let current_time = Math.round(new Date() / 1000);
    let query = {productStatus:{$eq:0}};

    // current_time < auctionEndTime;//bidding
    // auctionEndTime < current_time < auctionEndTime + 600; //revealing
    // current_time - 600 < auctionEndTime < current_time; //revealing
    // current_time > auctionEndTime + 600;//finalizing

    if(Object.keys(req.query).length == 0){
        query['auctionEndTime'] = {$gt: current_time}
    }else if(req.query.productStatus != undefined){
        if(req.query.productStatus == 'reveal'){
            query['auctionEndTime'] = {$gt: current_time - 600,$lt: current_time}
        }else if(req.query.productStatus == 'finalize'){
            query['auctionEndTime'] = {$lt: current_time - 600};
        }
    }

    ProductModel.find(query,null,{sort:'auctionEndTime'},(err,items)=>{
        if(err){
            console.error(err);
        }else{
            //console.log(items.length);
            res.send(items);
        }
    });
});

function newProductEventListener() {
    EcommerceStore.deployed().then(ins=>{

        // 如果你用的是 web3.js 0.x
        // watch 方法才可用，但强烈建议升级 web3.js，因为 0.x 已不再维护。
        
        // let productEvent = ins.NewProduct({fromBlock: 0, toBlock: 'latest'});
        //  productEvent.watch(function(error, result) {
        //     if(error) {
        //         console.error('Error in NewProduct Event:', error);
        //         result;
        //     }
        //     saveProduct(result.args);
        // });


        // web3.js 1.x 及以上用 on('data', ...) 和 getPastEvents。
        // 不要再用 watch 方法。

        // 监听历史事件
        ins.getPastEvents('NewProduct', {
            fromBlock: 0,
            toBlock: 'latest'
        }).then(events => {
            events.forEach(event => {
                saveProduct(event.returnValues);
            });
        });

        //实时监听事件必须用 WebSocket provider。
        //HTTP provider 只能查历史事件，不能实时推送。
        
        // 实时监听新事件
        ins.NewProduct().on('data', event => {
            console.log(event.returnValues);
            saveProduct(event.returnValues);
        }).on('error', error => {
            console.error('Error in NewProduct Event:', error);
        });
    });
}

function saveProduct(product) {
    ProductModel.findOne({"blockchainId":product._productId.toLocaleString()},(err,dbProject)=>{
        if(err){
            console.log(err);
            return;
        }
        if(dbProject != null){
            return;
        }

        var p = new ProductModel({ 
            blockchainId: product._productId,
            name: product._name, 
            category: product._category,
            ipfsImageHash: product._imageLink, 
            ipfsDescHash: product._descLink, 
            auctionStartTime: product._auctionStartTime,
            auctionEndTime: product._auctionEndTime, 
            price: product._startPrice, 
            condition: product._condition,
            productStatus: product._status});
        
        p.save(err =>{
            if(err){
                console.error(err);
                //handleError(err);
            }else{
                ProductModel.count({},(err,count) =>{
                    console.log("count is "+count);
                })
            }
        })

    });

}










