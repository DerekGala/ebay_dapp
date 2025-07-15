pragma solidity >0.4.22;

import "./Escrow.sol"; 

contract EcommerceStore{
    enum ProductStatus{ Open,Sold, Unsold}
    enum ProductCondition{New,Used}

    uint public productIndex;
    uint public productCount;
    mapping(uint => address) public productIdInStore;
    mapping(address => mapping(uint => Product)) stores;
    mapping(uint => address) productEscrow;

    struct Product{
        uint id;
        string name;
        string category;
        string imageLink;
        string descLink;
        uint auctionStartTime;
        uint auctionEndTime;
        uint startPrice;
        address highestBidder;
        uint highestBid;
        uint secondHighestBid;
        uint totalBids;
        ProductStatus status;
        ProductCondition condition;
        mapping(address => mapping(bytes32 => Bid)) bids;
    }

    struct Bid{
        address bidder;
        uint productId;
        uint value;
        bool revealed;
    }

    event NewProduct(
        uint indexed _productId,
        string _name,
        string _category,
        string _imageLink,
        string _descLink,
        uint _auctionStartTime,
        uint _auctionEndTime,
        uint _startPrice,
        uint _status,
        uint _condition
    );

    event BidEvent(address _bidder,uint _productId,uint _value);
    
    event reavelBidEvent(uint _refund,address _bidder,uint _productId,uint _value,bool _revealed);

    constructor() public {
        productIndex = 0;
    }

    function addProductToStore(
        string memory _name,
        string memory _category,
        string memory _imageLink,
        string memory _descLink,
        uint _auctionStartTime,
        uint _auctionEndTime,
        uint _startPrice,
        uint _productCondition
    ) public {
        require(_auctionStartTime < _auctionEndTime, "Auction start time must be before end time");
        require(_startPrice > 0, "Start price must be greater than zero");

        productIndex += 1;

        Product storage product = stores[msg.sender][productIndex];
        product.id = productIndex;
        product.name = _name;
        product.category = _category;
        product.imageLink = _imageLink;
        product.descLink = _descLink;
        product.auctionStartTime = _auctionStartTime;
        product.auctionEndTime = _auctionEndTime;
        product.startPrice = _startPrice;
        product.highestBidder = address(0);
        product.highestBid = 0;
        product.secondHighestBid = 0;
        product.totalBids = 0;
        product.status = ProductStatus.Open;
        product.condition = ProductCondition(_productCondition);

        productIdInStore[productIndex] = msg.sender;
        productCount += 1;


        //stores[msg.sender][productIndex] = product; 
        productIdInStore[productIndex] = msg.sender;
        emit NewProduct(
            product.id,
            product.name,
            product.category,
            product.imageLink,
            product.descLink,
            product.auctionStartTime,
            product.auctionEndTime,
            product.startPrice,
            uint(product.status),
            uint(product.condition)
        );
    }

    function getProduct(uint _productId) public view returns(uint, string memory, string memory, string memory, string memory, uint, uint, uint, ProductStatus, ProductCondition){
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return (product.id, product.name, product.category, product.imageLink, product.descLink, product.auctionStartTime,
      product.auctionEndTime, product.startPrice, product.status, product.condition);
    }


    function getProductCount() public view returns(uint){
        return productCount;
    }

    function getProductSeller(uint _productId) public view returns(address){
        return productIdInStore[_productId];
    }

    
    function bid(uint _productId, bytes32 _bid) public payable returns(bool){
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require(now >= product.auctionStartTime, "Auction has not started yet");
        require(now <= product.auctionEndTime, "Auction has already ended");
        require(msg.value > product.startPrice, "Bid must be greater than start price");
        require(product.bids[msg.sender][_bid].bidder == address(0), "Bid already exists for this bidder");
        product.bids[msg.sender][_bid] = Bid({
            bidder: msg.sender,
            productId: _productId,
            value: msg.value,
            revealed: false
        });
        product.totalBids += 1;

        Bid memory bidData = product.bids[msg.sender][_bid];
        emit BidEvent(bidData.bidder,bidData.productId,bidData.value);
        return true;
    }

    function revealBid(uint _productId,string memory _amount,string memory _secret) public {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        bytes32 sealedBid = sha3(_amount, _secret);
        Bid memory bidInfo = product.bids[msg.sender][sealedBid];
        require(bidInfo.bidder != address(0), "Bidder does not exist"); 
        require(now >= product.auctionEndTime, "Auction has not ended yet");
        require(bidInfo.revealed == false, "Bid already revealed");

        uint refund;
        uint amount = stringToUint(_amount);
        if(bidInfo.value < amount) {
            refund = bidInfo.value;
        }else {
            if(address(product.highestBidder) == 0){
                product.highestBidder = msg.sender;
                product.highestBid = amount;
                product.secondHighestBid = product.startPrice;
                refund = bidInfo.value - amount;
            }else{
                if(amount > product.highestBid) {
                    product.secondHighestBid = product.highestBid;
                    product.highestBidder.transfer(product.highestBid);
                    product.highestBid = amount;
                    product.highestBidder = msg.sender;
                    refund = bidInfo.value - amount;
                }else if(amount > product.secondHighestBid) {
                    product.secondHighestBid = amount;
                    refund = bidInfo.value;
                }else{
                    refund = bidInfo.value;
                }

            }
        }

        product.bids[msg.sender][sealedBid].revealed = true;
        if(refund > 0) {
            msg.sender.transfer(refund);
        }
        Bid memory bidResult = product.bids[msg.sender][sealedBid];
        emit reavelBidEvent(refund,bidResult.bidder,bidResult.productId,
        bidResult.value,bidResult.revealed);
    }

    function hightestBidderInfo(uint _productId) public view returns(address, uint ,uint){
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return (product.highestBidder, product.highestBid, product.secondHighestBid);
    }

    function totalBids(uint _productId) public view returns(uint){
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return product.totalBids;
    }


    function finalizeAuction(uint _productId) public payable{
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require(now > product.auctionEndTime, "Auction has not ended yet");
        require(product.status == ProductStatus.Open, "Auction is not open");
        require(msg.sender != productIdInStore[_productId], "Seller cannot finalize the auction");
        require(msg.sender != product.highestBidder, "Highest Buyer cannot finalize the auction");
        require(msg.value >= 5 ether ,"eth sent should be greater then 5 eth");
        if(product.highestBidder == address(0)){
            product.status = ProductStatus.Unsold;
        }else{
            Escrow escrow = (new Escrow).value(product.secondHighestBid)(
                _productId,
                product.highestBidder,
                productIdInStore[_productId],
                msg.sender
            );
            productEscrow[_productId] = address(escrow);
            product.status = ProductStatus.Sold;
            uint refund = product.highestBid - product.secondHighestBid;
            product.highestBidder.transfer(refund);
        }   
        stores[productIdInStore[_productId]][_productId] = product;
    }

    function becomeArbiter(uint _productId) public payable{
        Escrow(productEscrow[_productId]).becomeArbiter.value(msg.value)(msg.sender);
    }

    function cancelArbiter(uint _productId) public{
        Escrow(productEscrow[_productId]).cancelArbiter(msg.sender);
    }

    function burnDepositOfArbiter(uint _productId) public{
         Escrow(productEscrow[_productId]).burnDepositOfArbiter();
    }

    function feedback(uint _productId,uint _score) public{
         Escrow(productEscrow[_productId]).feedback(msg.sender, _score);
    }


    function getEscrowAddressByProductId(uint _productId) public view returns(address){
        return productEscrow[_productId];
    }


    function escrowInfo(uint _productId) public view returns(
        address,
        address,
        address,
        bool,
        uint,
        uint,
        uint,
        uint,
        uint){
        return Escrow(productEscrow[_productId]).escrowInfo(); 
    }



    function releaseAmountToSeller(uint _productId) public {
        Escrow(productEscrow[_productId]).releaseAmountToSeller(msg.sender);
    }
    
    function refoundAmountToBuyer(uint _productId) public {
        Escrow(productEscrow[_productId]).refoundAmountToBuyer(msg.sender);
    }


    function stringToUint(string memory _str) internal pure returns (uint) {
        
        bytes memory b = bytes(_str);
        uint result = 0;
        for (uint i =0;i<b.length;i++){
            if(b[i] >= 48 && b[i] <= 57) { // ASCII '0' to '9'
                result = result * 10 + (uint(b[i]) - 48);
            } else {
                revert("Invalid string to uint conversion");
            }
        }
        return result;
    }


}



