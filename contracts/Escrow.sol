pragma solidity >0.4.22;



contract Escrow {

    address public creator;
    uint public productId;
    address public buyer;
    address public seller;
    address public arbiter;
    address public secondArbiter;

    uint public minDeposit = 5 ether;

    //当资金被释放后，发送金额的 1% 给仲裁人作为服务费
    uint public totalAmount;
    uint public releaseAmout;
    uint public serviceFee;
    bool public fundsDisbursed;

    //任何人都可以终结拍卖和成为仲裁人
    mapping(address => uint)  arbiterCandidates;
    bool arbiterEnd;
    uint arbiterCount;

    mapping(address => bool ) releaseAmountFlag;
    uint public releaseCount;
    mapping(address => bool) refoundAmountFlag;
    uint public refoundCount;

    uint productScroe;

    event CreateEscrow(
        uint indexed _productId,
        address indexed _buyer,
        address indexed _seller,
        address _arbiter,
        uint _amount,
        uint releaseAmout,
        uint serviceFee
    );
    event UnlockAmount(
        uint indexed _productId,
        string indexed _operation,
        address indexed _operator
    );

    event DisburseAmount(
        uint indexed _productId,
        uint _amount,
        address indexed _beneficiary,
        uint releaseAmout,
        uint serviceFee
    );

    event Debug(address _refundAddr, uint _amount);

    constructor(
        uint _productId,
        address _buyer,
        address _seller,
        address _arbiter
    )  public payable {
        productId = _productId;
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        totalAmount = msg.value;
        serviceFee = (totalAmount * 1) / 100;
        releaseAmout = totalAmount - serviceFee;
        creator = msg.sender;
        fundsDisbursed = false;
        emit CreateEscrow(_productId, _buyer, _seller, _arbiter,totalAmount,releaseAmout,serviceFee);
    }


    //2, 目前，任何人都可以终结拍卖和成为仲裁人。实现一个用户必须发送 5 ETH 才能成为仲裁人的功能。
    function becomeArbiter(address arbiterAddr) public payable{
        uint depositAmount = msg.value;
        require(!arbiterEnd,"Become Arbiter has already ended");
        require(arbiterCandidates[arbiterAddr] == 0,"you are already being an arbiter candidate.");
        require(depositAmount >= minDeposit,"you should be greater then at lest 5 eth");
        
        if(arbiterCandidates[arbiter] < depositAmount){
            uint arbiterRefundAmount = arbiterCandidates[secondArbiter];
            address arbiterRefundAddr = secondArbiter;
            arbiterCandidates[arbiterAddr] = depositAmount;
            secondArbiter = arbiter;
            arbiter = arbiterAddr;
            arbiterCount += 1;
            minDeposit = depositAmount + 0.1 ether; // 可选：逐步提高门槛

            emit Debug(arbiterRefundAddr,arbiterRefundAmount);
            if(arbiterRefundAmount > 0){
                arbiterRefundAddr.transfer(arbiterRefundAmount);
                arbiterCandidates[arbiterRefundAddr] = 0;
            }
        }
        
        
    }

    //2. 他们可以在任何时候改变心意将保证金撤回。那么他们也就不能在参与应用作为仲裁人。
    function cancelArbiter(address arbiterAddr) public{
        require(!arbiterEnd,"Become Arbiter has already ended");
        require(arbiterCandidates[arbiterAddr] > 0,"you are not an arbiter candidate.");
        arbiterAddr.transfer(arbiterCandidates[arbiterAddr]);
        arbiterCandidates[arbiterAddr] = 0;
        if(arbiter == arbiterAddr){
            arbiter = secondArbiter;
        }
    }


    /*
    *3, 添加一个如果发现仲裁人有恶意行为（与卖方或者买方共谋）的话，销毁保证金的功能。
     */

     function burnDepositOfArbiter() public{
        require(!arbiterEnd,"Become Arbiter has already ended");
        require(msg.sender == creator,"you should be contract creator.");
        if(arbiterCandidates[arbiter] > 0){
            address(0).transfer(arbiterCandidates[arbiter]);
            arbiterCandidates[arbiter] = 0;
            arbiter = secondArbiter;
        }
     }

     /**4, 目前，卖方对于他们的服务没有收到任何评价。实现买方给卖方一个打分的功能。
      */

      function feedback(address _buyer,uint score) public {
        require(fundsDisbursed, "Funds has not been disbursed");
        require(_buyer == buyer, "you are not buyer");
        productScroe = score;
         //退回仲裁人保证金 ETH
        if(arbiterCandidates[secondArbiter] > 0){
            secondArbiter.transfer(arbiterCandidates[secondArbiter]);
            arbiterCandidates[secondArbiter] = 0;
        }
        if(arbiterCandidates[arbiter] > 0){
            arbiter.transfer(arbiterCandidates[arbiter]);
            arbiterCandidates[arbiter] = 0;
        }
      }


    function releaseAmountToSeller(address caller) public {
        require(!fundsDisbursed, "Funds already disbursed");
        arbiterEnd = true;
        if((caller == buyer || caller== seller || caller == arbiter) &&  releaseAmountFlag[caller] != true){
            releaseAmountFlag[caller] = true;
            releaseCount += 1;
            emit UnlockAmount(productId, "release to seller", caller);
        }

        if(releaseCount >= 2){
            //1, 当资金被释放后，发送金额的 1% 给仲裁人作为服务费。
            seller.transfer(releaseAmout);
            arbiter.transfer(serviceFee);

            //seller.transfer(amount);
            fundsDisbursed = true;
            emit DisburseAmount(productId, totalAmount, seller,releaseAmout,serviceFee);
        }
    }

    function refoundAmountToBuyer(address caller) public {
        require(!fundsDisbursed, "Funds already disbursed");
        arbiterEnd = true;
        if((caller == buyer || caller== seller || caller == arbiter) &&  refoundAmountFlag[caller] != true){
            refoundAmountFlag[caller] = true;
            refoundCount += 1;
            emit UnlockAmount(productId, "refound to buyer", caller);
        }

        if(refoundCount >= 2){
            buyer.transfer(totalAmount);
            fundsDisbursed = true;
            emit DisburseAmount(productId, totalAmount, buyer,releaseAmout,serviceFee);
        }
    }


    function escrowInfo() public view returns (
        address,
        address,
        address,
        bool,
        uint,
        uint,
        uint,
        uint,
        uint
    ) {
        return (buyer, seller, arbiter, fundsDisbursed, releaseCount, refoundCount,totalAmount,releaseAmout,serviceFee);
    }







}
