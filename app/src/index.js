import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract';
import ecommerce_store_artifact from '../../build/contracts/EcommerceStore.json';

var EcommerceStore = contract(ecommerce_store_artifact);

var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI({'host':'localhost','port':'5001', protocol: 'http'});
var offChainServer = "http://localhost:3000";
const categories = ["Art","Books","Cameras","Cell Phones & Accessories","Clothing","Computers & Tablets","Gift Cards & Coupons","Musical Instruments & Gear","Pet Supplies","Pottery & Glass","Sporting Goods","Tickets","Toys & Hobbies","Video Games"];


var accounts;
window.App = {
  start: function(){
    var self = this;
    EcommerceStore.setProvider(web3.currentProvider);
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length === 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }
      // Set the default account
      accounts = accs;
    });

    renderStore();
    var reader;
    $("#product-image").change(function(event) {
      var file = event.target.files[0];
      reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
    });

    $("#add-item-to-store").submit(function(event) {
      const req = $("#add-item-to-store").serialize();
      console.log("req: ",req);
      let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
      console.log("params: ",params);
      let decodedParams = {}
      Object.keys(params).forEach(function(key) {
        decodedParams[key] = decodeURIComponent(decodeURI(params[key]));
      });
      console.log("decodedParams: ",decodedParams);
      saveProduct(decodedParams,reader);
      event.preventDefault();
    });

    if($("#product-details").length > 0){

      console.log("Product details page detected");
      $("#bidding, #revealing").hide();
      let productId = new URLSearchParams(window.location.search).get('id');
      renderProductDetails(productId);
    }

    $("#bidding").submit(event => {
      $("#msg").hide();
      let productId = $("#product-id").val();
      let bidAmount = $("#bid-amount").val();
      let sendAmount =$("#bid-send-amount").val();
      let secretText = $("#secret-text").val();
      let sealedBid = web3.utils.sha3(web3.utils.toWei(bidAmount,'ether').toString()+secretText);
      console.log("Product ID: ", productId);
      console.log("Bid Amount: ", bidAmount);
      console.log("sealedBid Hash: ", sealedBid); 
      EcommerceStore.deployed().then(ins=>{
        ins.bid(parseInt(productId), sealedBid, {from: accounts[0], value: web3.utils.toWei(sendAmount, 'ether')}).then(res=>{
          console.log("Bid placed successfully: ", res);
          $("#msg").show();
          $("#msg").html("Your bid was successfully placed!");
        });
      });
      event.preventDefault();
    });

    $("#revealing").submit(event => {
      $("#msg").hide();
      let productId = $("#product-id").val();
      let actualAmount = $("#actual-amount").val();
      let revealSecretText = $("#reveal-secret-text").val();
      console.log("Product ID: ", productId);
      console.log("Actual Amount: ", actualAmount);
      console.log("Reveal secret text: ", revealSecretText); 
      EcommerceStore.deployed().then(ins=>{
        ins.revealBid(parseInt(productId), web3.utils.toWei(actualAmount, 'ether').toString(), revealSecretText, {from: accounts[0]}).then(res=>{
          console.log("Reveal successful: ", res);
          $("#msg").show();
          $("#msg").html("Your bid was successfully revealed!");
        });
      });
      event.preventDefault();
    });

    $("#finalize-auction").submit(event => {
      $("#msg").hide();
      let productId = $("#product-id").val();
      EcommerceStore.deployed().then(ins=>{
        ins.finalizeAuction(parseInt(productId), {from: accounts[0]}).then(res=>{
          console.log("Auction finalized successfully: ", res);
          $("#msg").show();
          $("#msg").html("The auction has been finalized and winner declared.");
          location.reload();
        }).catch(err => {
          console.error("Error finalizing auction: ", err);
          $("#msg").show();
          $("#msg").html("The auction can not be finalized by the buyer or seller, only a third party aribiter can finalize it");
        });
      });
      event.preventDefault();
    });

    $("#release-funds").click(()=> {
      $("#msg").hide();
      let productId = new URLSearchParams(window.location.search).get('id');
      EcommerceStore.deployed().then(ins=>{
         $("#msg").html("Your transaction has been submitted. Please wait for few seconds for the confirmation").show();
          console.log(productId);
          ins.releaseAmountToSeller(parseInt(productId),{from: accounts[0]}).then(res=>{
            console.log("Funds released successfully: ", res);
            $("#msg").html("Funds have been released to the seller.").show();
            location.reload();
          }).catch(err => {
            console.error("Error releasing funds: ", err);
            $("#msg").html("You can not release the funds, only the buyer or arbiter can release the funds").show();
          });
      });
    });

    $("#refund-funds").click(()=> {
      $("#msg").hide();
       let productId = new URLSearchParams(window.location.search).get('id');
       EcommerceStore.deployed().then(ins=>{
          $("#msg").html("Your transaction has been submitted. Please wait for few seconds for the confirmation").show();
            console.log(productId);
            ins.refoundAmountToBuyer(parseInt(productId),{from: accounts[0]}).then(res=>{
              console.log("Funds refunded successfully: ", res);
              $("#msg").html("Funds have been refunded to the buyer.").show();
              location.reload();
            }).catch(err => {
              console.error("Error refunding buyer: ", err);
              $("#msg").html("You can not refund the buyer, only the seller or arbiter can refund the buyer").show();
            });
       });
       alert("refund funds!");
    });

    



  },
}

function renderStore() {

  renderProduct("product-list",{});
  renderProduct("product-reveal-list",{productStatus : "reveal"});
  renderProduct("product-finalize-list",{productStatus : "finalize"});
  //TODO 可以通过 categories 做筛选
  categories.forEach(value=>{
    $("#categories").append("<div>"+value+"</div>")
  });


  // EcommerceStore.deployed().then(function(instance) {
  //   instance.getProduct(1).then(function(product) {
  //     $('#product-list').append(buildProductFromBlockChain(product));
  //   });
  //   instance.getProduct(2).then(function(product) {
  //     $('#product-list').append(buildProductFromBlockChain(product));
  //   });
  //   instance.getProduct(3).then(function(product) {
  //     $('#product-list').append(buildProductFromBlockChain(product));
  //   });
  // });
}

function renderProduct(div,filter){
  $.ajax({
    url: offChainServer + "/products",
    type: 'get',
    contentType:'application/json;charset=utf-8',
    data:filter
  }).done(data=>{
    if(data.length == 0){
      $("#"+div).html("No Products found!");
    }else{
      $("#"+div).html("");
    }
    while(data.length > 0){
      //splice: 截取 0-3 的数据，到 chunks 里面， data 的数据也会变化。
      let chunks = data.splice(0,4);
      let row = $("<div/>");
      row.addClass("row");
      chunks.forEach(p =>{
        let node = buildProduct(p);
        row.append(node);
      });
      $("#"+div).append(row);
    }
  });
}


function renderProductDetails(productId) {
  EcommerceStore.deployed().then(function(instance) {
    instance.getProduct(productId).then(function(product) {
      console.log("Product details: ", product);
      let desc  =  '';
      ipfs.cat(product[4]).then(function(file) {
        desc = file.toString('utf-8');
        $("#product-desc").append("<div>"+desc+"</div>");
      });
      $("#product-image").append("<img src='http://localhost:9000/ipfs/" + product[3] + "' width='250px' />");
      $("#product-name").html("<h3>" + product[1] + "</h3>");
      $("#product-price").append(displayPrice(product[7]));
      $("#product-id").val(productId);
      $("#product-auction-end").html("<div>Auction End: " + displayTime(product[6]) + "</div>");
      $("#bidding, #revealing, #finalize-auction, #escrow-info").hide();

      let currentTime = getCurrentTime();
      console.log("Current time: ", currentTime);
      console.log("Auction end time: ", product[6].toString());

      if(parseInt(product[8]) === 1){
        //$("#product-status").html("<h3>Product sold</h3>");

        EcommerceStore.deployed().then(ins=>{

          ins.hightestBidderInfo(productId).then(f => {
          $("#product-status").html("<h4> Auction has ended. Product sold to " + f[0] + " for " + displayPrice(f[2]) +
                ". The money is in the escrow. Two of the three participants (Buyer, Seller and Arbiter) have to " +
                "either release the funds to seller or refund the money to the buyer</h4>");
          });

          ins.escrowInfo(productId).then(escrowInfo => {
            $("#buyer").html("Buyer: " + escrowInfo[0]);
            $("#seller").html("Seller: " + escrowInfo[1]);
            $("#arbiter").html("Arbiter: " + escrowInfo[2]);
            if(escrowInfo[3] == true){
              $("#release-count").html("Amount from the escrow has been released");
              $("#escrow-operations").hide();
            } else {
              $("#release-count").html(escrowInfo[4] + " of 3 participants have agreed to release funds");
              $("#refund-count").html(escrowInfo[5] + " of 3 participants have agreed to refund the buyer");
            }
          }).catch(err => {
            console.error("Error fetching winner: ", err);
          });
        });
        $("#escrow-info").show();
      }else if(parseInt(product[8]) === 2){
        $("#product-status").html("Product was not sold");
      }else{ 
        if(currentTime < product[6]){
          $("#bidding").show();
        }else if( currentTime < (parseInt(product[6]) + 600)){
          $("#revealing").show();
        }else {
          $("#finalize-auction").show();
        }
      }
    
    })
    .catch(function(err) {
      console.error("Error fetching product details: ", err);
    });
  });
}
  
function buildProduct(product) {
  let node = $("<div/>");
  node.addClass("col-sm-3 text-center col-margin-bottom-1");
  node.append("<a href = 'product.html?id="+product.blockchainId+"'><img src='http://localhost:9000/ipfs/" + product.ipfsImageHash + "' width='150px' /></a>");
  node.append("<div>" + product.name+ "</div>");
  node.append("<div>" + product.category+ "</div>");
  node.append("<div>" + new Date(product.auctionStartTime * 1000).toLocaleString()+ "</div>");
  node.append("<div>" + new Date(product.auctionEndTime * 1000).toLocaleString()+ "</div>");
  console.log(product.price);
  node.append("<div>" + displayPrice(product.price.toString()) + "</div>");
  return node;

}

function buildProductFromBlockChain(product) {
  let node = $("<div/>");
  node.addClass("col-sm-3 text-center col-margin-bottom-1");
  node.append("<a href = 'product.html?id="+product[0]+"'><img src='http://localhost:9000/ipfs/" + product[3] + "' width='150px' /></a>");
  node.append("<div>" + product[1]+ "</div>");
  node.append("<div>" + product[2]+ "</div>");
  node.append("<div>" + new Date(product[5] * 1000).toLocaleString()+ "</div>");
  node.append("<div>" + new Date(product[6] * 1000).toLocaleString()+ "</div>");
  node.append("<div>" + displayPrice(product[7]) + "</div>");
  return node;

}


function saveProduct(params, reader) {
  let imageId,descId;
  saveImageOnIPFS(reader).then(imgId => {
    imageId = imgId;
    saveTextBlobOnIPFS(params['product-description']).then(res => {  
      descId = res;
      saveProductOnBlockchain(params, imageId, descId);
    });
  });
}

function saveImageOnIPFS(reader) {
  return new Promise((resolve,reject)=>{
    let buffer = Buffer.from(reader.result);
    ipfs.add(buffer).then(res=>{
      console.log("Image added to IPFS: ", res);
      resolve(res[0].hash);
    }).catch(err=>{
      console.error("Error adding image to IPFS: ", err);
      reject(err);
    });
  });
}

function saveTextBlobOnIPFS(text) {
  return new Promise((resolve,reject)=>{
    let buffer = Buffer.from(text,'utf-8');
    ipfs.add(buffer).then(res=>{
      console.log("Text blob added to IPFS: ", res);
      resolve(res[0].hash);
    }).catch(err=>{
      console.error("Error adding text blob to IPFS: ", err);
      reject(err);
    });
  });
}

function saveProductOnBlockchain(params, imageId, descId) {
  console.log(params);
  console.log(accounts[0]);
  let auctionStartTime = Date.parse(params["product-auction-start"]) / 1000;
  let auctionEndTime = auctionStartTime + parseInt(params["product-auction-end"]) * 24 * 60 * 60
  EcommerceStore.deployed().then(ins=>{
    ins.addProductToStore(
      params['product-name'],
      params['product-category'],
      imageId,
      descId,
      auctionStartTime,
      auctionEndTime,
      web3.utils.toWei(params['product-price'], 'ether'),
      parseInt(params["product-condition"]),{from:accounts[0]}
    ).then(function(result) {
      $("#msg").show();
      $("#msg").html("Your product was successfully added to your store!");
      console.log("Product added: ", result);
    }).catch(function(err) {
      console.error("Error adding product: ", err);
    });
  });
}


function displayPrice(price) {
  return 'Ξ ' + web3.utils.fromWei(price, 'ether') + " ETH";
}

function getCurrentTime() {
  return Math.floor(new Date() / 1000);
}

function displayTime(timestamp) {
  let currentTime = getCurrentTime();
  let remainingTime = timestamp - currentTime;
  if (remainingTime <= 0) {
    return "Auction ended";
  }

  let days = Math.trunc(remainingTime / (24 * 60 * 60));
  remainingTime -= days * (24 * 60 * 60);
  let hours = Math.trunc(remainingTime / (60 * 60));
  remainingTime -= hours * (60 * 60);
  let minutes = Math.trunc(remainingTime / 60);
  remainingTime -= minutes * 60;
  let seconds = remainingTime;
  if (days > 0) {
    return "Auction ends in " + days + " days, " + hours + ", hours, " + minutes + " minutes";
  } else if (hours > 0) {
    return "Auction ends in " + hours + " hours, " + minutes + " minutes ";
  } else if (minutes > 0) {
    return "Auction ends in " + minutes + " minutes ";
  } else {
    return "Auction ends in " + seconds + " seconds";
  }
}

window.addEventListener('load', function() {
  if (typeof web3 !== 'undefined') {
    // Use the provider from the browser
    window.web3 = new Web3(web3.currentProvider);
  } else {
    // Fallback to localhost if no web3 instance injected
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
