
const EcommerceStore = artifacts.require("EcommerceStore");
const Escrow = artifacts.require("Escrow");
const {time , expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

let chai;
let expect;

before(async () => {
  chai = await import('chai');
  expect = chai.expect;
});


contract("EcommerceStore",accounts=>{

    const [owner, seller1, seller2, buyer1, buyer2, buyer3] = accounts;
    let ecommerceStore;

    // 测试产品数据
    const mockProducts = [
        {
        name: 'iPhone 5',
        category: 'Electronics',
        imageLink: 'QmNQnmccZoPjpu6e1Bko9nYrSHxRWEJuVLykkuUjueabq3',
        descLink: 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8',
        duration: 300,  // 5分钟
        priceMultiplier: '2',
        condition: 0   // 新品
        },
        {
        name: 'iPhone 6s',
        category: 'Electronics',
        imageLink: 'QmRbSjq6uyRt5BEGxMQkQYgrFG2eWWZcnrR25G9LHMg2W1',
        descLink: 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8',
        duration: 600, // 10分钟
        priceMultiplier: '4',
        condition: 1    // 二手
        },
        {
        name: 'Designer Jeans',
        category: 'Clothing',
        imageLink: 'QmYW9saHVRQgQ843kkZpFTDfcPvovgS8DPSTxAEpvXk1pw',
        descLink: 'QmQxk3691RYN6eKx13GCYTdVijjmaKvSJ8uKfkvNB2tTq8',
        duration: 3600, // 1小时
        priceMultiplier: '5',
        condition: 1
        }
    ];



    // 计算测试用的时间戳和价格
   
    before(async ()=>{
        ecommerceStore = await EcommerceStore.new();
    });

    describe("contract init check",()=>{
        it("should have already deployed contract", async()=>{
            expect(ecommerceStore.address).to.not.equal(0x0);
            expect(ecommerceStore.address).to.not.be.null;
            expect(ecommerceStore.address).to.not.be.undefined;
        });

        it("init product count should be 0",async()=>{
            const productCount = await ecommerceStore.productIndex();
            expect(productCount.toString()).to.be.equal("0");
        })
    });

    const calculateTestData = () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const basePrice = web3.utils.toBN(web3.utils.toWei('1', 'ether'));

        return mockProducts.map(product => ({
        name: product.name,
        category: product.category,
        imageLink: product.imageLink,
        descLink: product.descLink,
        startTime: currentTime,
        endTime: currentTime + product.duration,
        price: basePrice.mul(web3.utils.toBN(product.priceMultiplier)).toString(),
        condition:product.condition
        }));
    };


    describe("product manage",()=>{
        let testProducts;
        beforeEach(async() =>{
            //ecommerceStore = await EcommerceStore.new();
            testProducts = calculateTestData();
        })

        it("sellers can add products", async()=>{
            
            const product = testProducts[0];

            const receipt = await ecommerceStore.addProductToStore(
                product.name,
                product.category,
                product.imageLink,
                product.descLink,
                product.startTime,
                product.endTime,
                product.price,
                product.condition,
                { from: seller1 }
            )

            expectEvent(receipt, 'NewProduct', {
                _productId: web3.utils.toBN(1),
                _name: product.name,
                _startPrice:product.price
            });

            const productCount = await ecommerceStore.getProductCount()
            expect(productCount.toString()).to.be.equal("1");

            const storedProduct = await ecommerceStore.getProduct(1);
            expect(storedProduct[1]).to.equal(product.name);
            expect(storedProduct[7].toString()).to.equal(product.price);

            const productSeller = await ecommerceStore.getProductSeller(1);
            expect(productSeller).to.equal(seller1);

        });

        it("sellers can add many products",async()=>{
            for(let i=0;i<testProducts.length;i++){
                const product = testProducts[i];
                await ecommerceStore.addProductToStore(
                    product.name,
                    product.category,
                    product.imageLink,
                    product.descLink,
                    product.startTime,
                    product.endTime,
                    product.price,
                    product.condition,
                    { from: seller1 }
                )
            }
            const productCount = await ecommerceStore.getProductCount();
            expect(parseInt(productCount.toString())).to.equal(testProducts.length+1);
        });

        
        it("any user can bid products seccessfully",async()=>{
            const productId = 1;
            const firstBidAmount = '2';
            const firstSendAmount = '3';
            const firstSecretText = "123456";
            const firstSealedBid =  web3.utils.sha3(web3.utils.toWei(firstBidAmount,'ether').toString()+firstSecretText);
            const firstBidReceipt = await ecommerceStore.bid(productId, firstSealedBid, {
                                    from: buyer1,
                                    value: web3.utils.toWei(firstSendAmount, 'ether')
                                });
            console.log(firstBidReceipt); 
            expectEvent(firstBidReceipt,"BidEvent"
            ,{
                _bidder: buyer1,
                _productId: productId.toString(),
                _value: web3.utils.toWei(firstSendAmount, 'ether')
            });

            const secondBidAmount = '3';
            const secondSendAmount = '5';
            const secondSecretText = "147258";
            const secondSealedBid =  web3.utils.sha3(web3.utils.toWei(secondBidAmount,'ether').toString()+secondSecretText);
            const secondBidReceipt = await ecommerceStore.bid(productId, secondSealedBid, {
                                    from: buyer2,
                                    value: web3.utils.toWei(secondSendAmount, 'ether')
                                });
            console.log(secondBidReceipt); 
            expectEvent(secondBidReceipt,"BidEvent"
            ,{
                _bidder: buyer2,
                _productId: productId.toString(),
                _value: web3.utils.toWei(secondSendAmount, 'ether')
            });
        });

        it("bid products,if same bidder bids the product, bid failed",
        async function () {
            const productId = 1;
            const bidAmount = '2';
            const sendAmount = '3';
            const secretText = "123456";
            const sealedBid =  web3.utils.sha3(web3.utils.toWei(bidAmount,'ether').toString()+secretText);
            await expectRevert(ecommerceStore.bid(productId,sealedBid,{from:buyer1,value:web3.utils.toWei(sendAmount,'ether')})
            ,"Bid already exists for this bidder");
        });

        it("bid products,Auction eth is less then product amount, bid failed",
        async function () {
            const productId = 1;
            const bidAmount = '1';
            const sendAmount = '1';
            const secretText = "123456";
            const sealedBid =  web3.utils.sha3(web3.utils.toWei(bidAmount,'ether').toString()+secretText);
            await expectRevert(ecommerceStore.bid(productId,sealedBid,{from:buyer1,value:web3.utils.toWei(sendAmount,'ether')})
            ,"Bid must be greater than start price");
        })


        it("revealBid,if Auction time does not end, revealBid failed",
        async function () {
            const productId = 1;
            const bidAmount = '2';
            const secretText = "123456";
            await expectRevert(ecommerceStore.revealBid(productId,web3.utils.toWei(bidAmount,'ether'),
            secretText,{from:buyer1})
            ,"Auction has not ended yet");
        });

        it("revealBid,if bidder does not exist, revealBid failed",
        async function () {
            const productId = 1;
            const bidAmount = '2';
            const secretText = "123456";
            await expectRevert(ecommerceStore.revealBid(productId,web3.utils.toWei(bidAmount,'ether'),
            secretText,{from:seller1})
            ,"Bidder does not exist");
        });
        

        it("reveal bid successfully",async()=>{
            // 获取当前时间
            const startTime = await time.latest();
            console.log('当前时间:', startTime.toString());
            // 增加5分钟
            await time.increase(time.duration.minutes(6));
            // 验证时间已增加
            const newTime = await time.latest();
            console.log('增加6分钟后:', newTime.toString());

            const productId = 1;
            const firstBidAmount = '2';
            const firstSecretText = "123456";
            const firstRevealBidReceipt = 
            await ecommerceStore.revealBid(productId,web3.utils.toWei(firstBidAmount,'ether'),
            firstSecretText,{from:buyer1});

            console.log('firstRevealBidReceipt'); 
            expectEvent(firstRevealBidReceipt,"reavelBidEvent"
            ,{
                _refund: web3.utils.toWei('1', 'ether'),
                _bidder: buyer1,
                _productId: productId.toString(),
                _value: web3.utils.toWei('3', 'ether'),
                _revealed:true
            });

            const secondBidAmount = '3';
            const secondSecretText = "147258";
            const secondRevealBidReceipt = 
            await ecommerceStore.revealBid(productId,web3.utils.toWei(secondBidAmount,'ether'),
            secondSecretText,{from:buyer2});
            console.log('secondRevealBidReceipt'); 
            expectEvent(secondRevealBidReceipt,"reavelBidEvent"
            ,{
                _refund: web3.utils.toWei('2', 'ether'),
                _bidder: buyer2,
                _productId: productId.toString(),
                _value: web3.utils.toWei('5', 'ether'),
                _revealed:true
            });

        });

        it("revealBid,if bidder has alreay revaled, revealBid failed",
        async function () {
            const productId = 1;
            const firstBidAmount = '2';
            const firstSecretText = "123456";
            await expectRevert(ecommerceStore.revealBid(productId,web3.utils.toWei(firstBidAmount,'ether'),
            firstSecretText,{from:buyer1}),"Bid already revealed");
        });

       

        it("finalizeAuction, artbter shuld not be seller,  finalize auction failed",async()=>{
            const productId = 1;
            await expectRevert(ecommerceStore.finalizeAuction(productId,{from:seller1})
            ,"Seller cannot finalize the auction");
        });

         it("finalizeAuction,highest bidder shuld not revaled, finalize auction failed",
        async function () {
            const productId = 1;
            await expectRevert(ecommerceStore.finalizeAuction(productId,{from:buyer2})
            ,"Highest Buyer cannot finalize the auction");
        });

        it("finalizeAuction,you shuld send eht greater then 5 eth, finalize auction failed",
        async function () {
            const productId = 1;
            await expectRevert(ecommerceStore.finalizeAuction(productId,
                {from:seller2,value:web3.utils.toWei('4','ether')})
            ,"eth sent should be greater then 5 eth");
        });

        it("finalizeAuction, finalize auction successfully",
        async function () {
            const productId = 1;
            await ecommerceStore.finalizeAuction(productId,
                {from:seller2,value:web3.utils.toWei('5','ether')});
            const escrowInfo = await ecommerceStore.escrowInfo(productId);
            const totalAmount = parseInt(escrowInfo[6].toString());
            const releaseAmout = parseInt(escrowInfo[7].toString());
            const serviceFee = parseInt(escrowInfo[8].toString());
            console.log(totalAmount)
            console.log(releaseAmout)
            console.log(serviceFee)
            
            expect(serviceFee).to.equal(totalAmount - releaseAmout);
            expect(releaseAmout).to.equal(totalAmount - serviceFee);
        });
        
        it("becomeArbiter,if you send eth less then minimux eth,becomeArbiter failed",
        async function () {
            const productId = 1;
            await expectRevert(ecommerceStore.becomeArbiter(productId,
                {from:owner,value:web3.utils.toWei('4.9','ether')})
            ,"you should be greater then at lest 5 eth")
            
        });

        
        it("becomeArbiter,you become arbiter seccussfully",
        async function () {

            const productId = 1;
            // 获取 escrow 地址
            const escrowAddress = await ecommerceStore.getEscrowAddressByProductId(1);
            const escrowInstance = await Escrow.at(escrowAddress);

            const balance = await web3.eth.getBalance(escrowAddress);
            console.log("Escrow balance:", web3.utils.fromWei(balance, 'ether'), "ETH");

            const escrowReceipt1 = await ecommerceStore.becomeArbiter(productId,
                {from:owner,value:web3.utils.toWei('5.1','ether')})
            //console.log(escrowReceipt1);
            const balance1 = await web3.eth.getBalance(escrowAddress);
            console.log("Escrow balance1:", web3.utils.fromWei(balance1, 'ether'), "ETH");

            const escrowReceipt2 = await ecommerceStore.becomeArbiter(productId,
                {from:seller2,value:web3.utils.toWei('6','ether')})
            //console.log(escrowReceipt2);
            const balance2 = await web3.eth.getBalance(escrowAddress);
            console.log("Escrow balance3:", web3.utils.fromWei(balance2, 'ether'), "ETH");
            expect(balance2).to.equal(web3.utils.toWei('13.1','ether'))

            const escrowReceipt3 = await ecommerceStore.becomeArbiter(productId,
                {from:buyer3,value:web3.utils.toWei('7','ether')})
            //console.log(escrowReceipt3);
            const balance3 = await web3.eth.getBalance(escrowAddress);
            console.log("Escrow balance3:", web3.utils.fromWei(balance3, 'ether'), "ETH");
            expect(balance3).to.equal(web3.utils.toWei('15','ether'))

            // 监听事件
            const events = await escrowInstance.getPastEvents('Debug', {
                fromBlock: 0,
                toBlock: 'latest'
            });
            //console.log(events);
        });


        it("becomeArbiter,if you are already arbiter,becomeArbiter failed",
        async function () {
            const productId = 1;
            await expectRevert(ecommerceStore.becomeArbiter(productId,
                {from:buyer3,value:web3.utils.toWei('8','ether')})
            ,"you are already being an arbiter candidate.")
        });

        it("cancelArbiter,if you are not arbiter candidate,cancelArbiter failed",
        async function () {
            const productId = 1;
            await expectRevert(ecommerceStore.cancelArbiter(productId,
                {from:seller1})
            ,"you are not an arbiter candidate.")
        });

        it("cancelArbiter,cancel arbiter successfully",
        async function () {
            const productId = 1;
            await ecommerceStore.cancelArbiter(productId,
                //{from:seller2}) //buyer3
                {from:buyer3}) 
            // 获取 escrow 地址
            const escrowAddress = await ecommerceStore.getEscrowAddressByProductId(productId);
            const balance = await web3.eth.getBalance(escrowAddress);
            console.log("After cancelArbiter balance:", web3.utils.fromWei(balance, 'ether'), "ETH");
            //expect(balance).to.equal(web3.utils.toWei('9','ether'))
            expect(balance).to.equal(web3.utils.toWei('8','ether'))
            const escrowInfo = await ecommerceStore.escrowInfo(productId);
            //expect(escrowInfo[2]).to.equal(buyer3);
            expect(escrowInfo[2]).to.equal(seller2);
        });

        it("burnDepositOfArbiter seccessfully",
        async function () {
            const productId = 1;
            await ecommerceStore.burnDepositOfArbiter(productId);
            const escrowAddress = await ecommerceStore.getEscrowAddressByProductId(productId);
            const balance = await web3.eth.getBalance(escrowAddress);
            console.log("After burnDepositOfArbiter balance:", web3.utils.fromWei(balance, 'ether'), "ETH");
            expect(balance).to.equal(web3.utils.toWei('8','ether'))
        });

        

        it("releaseAmountToSeller seccessfully",
        async function () {
            const productId = 1;
            const escrowAddress = await ecommerceStore.getEscrowAddressByProductId(productId);
            //arbiter: buyer3
            await ecommerceStore.releaseAmountToSeller(productId,{from:buyer3});
           //buyer: buyer2
            await ecommerceStore.releaseAmountToSeller(productId,{from:buyer2});

            balance = await web3.eth.getBalance(escrowAddress);
            console.log("after releaseAmountToSeller balance:", web3.utils.fromWei(balance, 'ether'), "ETH");
            expect(balance).to.equal(web3.utils.toWei('13','ether'))

            //DisburseAmount
            // 监听事件
            const escrowInstance = await Escrow.at(escrowAddress);
            const events = await escrowInstance.getPastEvents('DisburseAmount', {
                fromBlock: 0,
                toBlock: 'latest'
            });
            console.log(events);
        });

        it("refoundAmountToBuyer seccessfully",
        async function () {
            const productId = 1;
            const escrowAddress = await ecommerceStore.getEscrowAddressByProductId(productId);
            //arbiter: buyer3
            await ecommerceStore.refoundAmountToBuyer(productId,{from:buyer3});
           //buyer: buyer2
            await ecommerceStore.refoundAmountToBuyer(productId,{from:buyer2});

            balance = await web3.eth.getBalance(escrowAddress);
            console.log("after releaseAmountToSeller balance:", web3.utils.fromWei(balance, 'ether'), "ETH");
            expect(balance).to.equal(web3.utils.toWei('13','ether'))

            //DisburseAmount
            // 监听事件
            const escrowInstance = await Escrow.at(escrowAddress);
            const events = await escrowInstance.getPastEvents('DisburseAmount', {
                fromBlock: 0,
                toBlock: 'latest'
            });
            console.log(events);
        });

        it("feedback, if you are not buyer,feedback failed",
        async function () {
            const productId = 1;
            const score = 80;
            await expectRevert(
                ecommerceStore.feedback(productId,score,{from:buyer3}),
            "you are not buyer");
        });

        it("feedback seccessfully",
        async function () {
            const productId = 1;
            const score = 80;
            await ecommerceStore.feedback(productId,score,{from:buyer2});
            const escrowAddress = await ecommerceStore.getEscrowAddressByProductId(productId);
            const balance = await web3.eth.getBalance(escrowAddress);
            console.log("After feedback balance:", web3.utils.fromWei(balance, 'ether'), "ETH");
            expect(balance).to.equal(web3.utils.toWei('0','ether'))
        });

    });

})
