pragma solidity >0.4.22;

contract Escrow {
    uint public productId;
    address public buyer;
    address public seller;
    address public arbiter;
    uint public amount;
    bool public fundsDisbursed;
    mapping(address => bool ) releaseAmount;
    uint public releaseCount;
    mapping(address => bool) refoundAmount;
    uint public refoundCount;

    event CreateEscrow(
        uint indexed _productId,
        address indexed _buyer,
        address indexed _seller,
        address _arbiter,
        uint _amount
    );
    event UnlockAmount(
        uint indexed _productId,
        string indexed _operation,
        address indexed _operator
    );

    event DisbureseAmount(
        uint indexed _productId,
        uint _amount,
        address indexed _beneficiary
    );

    constructor(
        uint _productId,
        address _buyer,
        address _seller,
        address _arbiter
    ) payable public {
        productId = _productId;
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        amount = msg.value;
        fundsDisbursed = false;
        emit CreateEscrow(_productId, _buyer, _seller, _arbiter,amount);
    }


    function releaseAmountToSeller(address caller) public {
        require(!fundsDisbursed, "Funds already disbursed");
        if((caller == buyer || caller== seller || caller == arbiter) &&  releaseAmount[caller] != true){
            releaseAmount[caller] = true;
            releaseCount += 1;
            emit UnlockAmount(productId, "release to seller", caller);
        }

        if(releaseCount >= 2){
            seller.transfer(amount);
            fundsDisbursed = true;
            emit DisbureseAmount(productId, amount, seller);
        }
    }

    function refoundAmountToBuyer(address caller) public {
        require(!fundsDisbursed, "Funds already disbursed");
        if((caller == buyer || caller== seller || caller == arbiter) &&  refoundAmount[caller] != true){
            refoundAmount[caller] = true;
            refoundCount += 1;
            emit UnlockAmount(productId, "refound to buyer", caller);
        }

        if(refoundCount >= 2){
            buyer.transfer(amount);
            fundsDisbursed = true;
            emit DisbureseAmount(productId, amount, buyer);
        }
    }


    function escrowInfo() public view returns (
        address,
        address,
        address,
        bool,
        uint,
        uint
    ) {
        return (buyer, seller, arbiter, fundsDisbursed, releaseCount, refoundCount);
    }







}
