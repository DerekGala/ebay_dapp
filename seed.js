EcommerceStore = artifacts.require("./EcommerceStore.sol");

module.exports = function() {
    current_time = Math.round(new Date() / 1000);
    const BN = web3.utils.toBN;
    amt_1 = web3.utils.toWei('1','ether');
    let amt_2 = BN(amt_1).mul(BN('2')).toString();
    let amt_3 = BN(amt_1).mul(BN('3')).toString();
    let amt_4 = BN(amt_1).mul(BN('4')).toString();
    let amt_5 = BN(amt_1).mul(BN('5')).toString();
    EcommerceStore.deployed().then(function(i) {i.addProductToStore('iphone 5', 'Cell Phones & Accessories', 'QmNQnmccZoPjpu6e1Bko9nYrSHxRWEJuVLykkuUjueabq3', 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8', current_time, current_time + 300, amt_2, 0).then(function(f) {console.log(f)})});
    EcommerceStore.deployed().then(function(i) {i.addProductToStore('iphone 5s', 'Cell Phones & Accessories', 'QmdF3uVoECm4K8jMbQ8wmxY945p5equHdR3WxXRFJ3oCAU', 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8', current_time, current_time + 500, amt_3, 1).then(function(f) {console.log(f)})});
    EcommerceStore.deployed().then(function(i) {i.addProductToStore('iphone 6', 'Cell Phones & Accessories', 'QmaML3V2XrgcJLARufgexVChPnyxXuXB23AXBEc3MBAnnN', 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8', current_time, current_time + 800, amt_1, 0).then(function(f) {console.log(f)})}); 
    EcommerceStore.deployed().then(function(i) {i.addProductToStore('iphone 6s', 'Cell Phones & Accessories', 'QmRbSjq6uyRt5BEGxMQkQYgrFG2eWWZcnrR25G9LHMg2W1', 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8', current_time, current_time + 86400, amt_4, 1).then(function(f) {console.log(f)})});
    EcommerceStore.deployed().then(function(i) {i.addProductToStore('iphone 7', 'Cell Phones & Accessories', 'QmYW9saHVRQgQ843kkZpFTDfcPvovgS8DPSTxAEpvXk1pw', 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8', current_time, current_time + 86400, amt_5, 1).then(function(f) {console.log(f)})});
    EcommerceStore.deployed().then(function(i) {i.addProductToStore('Jeans', 'Clothing, Shoes & Accessories', 'QmYW9saHVRQgQ843kkZpFTDfcPvovgS8DPSTxAEpvXk1pw', 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8', current_time, current_time + 86400 + 86400 + 86400, amt_5, 1).then(function(f) {console.log(f)})});
    EcommerceStore.deployed().then(function(i) {i.productIndex.call().then(function(f){console.log(f)})});
};